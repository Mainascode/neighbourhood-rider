import express from "express";
import requireAuth from "../../middleware/requireAuth.js";
import requireAdmin from "../../middleware/requireAdmin.js";
import User from "../../models/User.js";
import DeviceToken from "../../models/DeviceToken.js";
import { getMessaging } from "../../config/firebaseAdmin.js";
import { sendNotification } from "../../lib/notificationService.js";

const router = express.Router();

// POST /api/notifications/send
// Admin-only send via Firebase Cloud Messaging.
router.post("/send", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, title, body } = req.body || {};
    if (!userId || !title || !body) {
      return res.status(400).json({ error: "userId, title, and body are required" });
    }

    const user = await User.findById(userId).select("fcmTokens");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const tokens = Array.from(new Set(user.fcmTokens || []));
    if (!tokens.length) {
      return res.status(404).json({ error: "User has no FCM tokens" });
    }

    const messaging = getMessaging();
    const result = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: {
        userId: String(userId),
      },
    });

    const invalidTokens = [];
    result.responses.forEach((response, idx) => {
      if (response.success) return;
      const code = response.error?.code || "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-argument")
      ) {
        invalidTokens.push(tokens[idx]);
      }
    });

    if (invalidTokens.length) {
      await User.findByIdAndUpdate(userId, {
        $pull: { fcmTokens: { $in: invalidTokens } },
      });
      await DeviceToken.deleteMany({ deviceToken: { $in: invalidTokens } });
    }

    return res.json({
      success: true,
      sent: result.successCount,
      failed: result.failureCount,
      invalidTokensRemoved: invalidTokens.length,
    });
  } catch (error) {
    console.error("FCM send error:", error);
    return res.status(500).json({ error: "Failed to send push notification" });
  }
});

// POST /api/notifications/announce
// Admin-only announcement broadcast (stored + in-app + push).
router.post("/announce", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, body, recipientType = "USER", userIds = [] } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ error: "title and body are required" });
    }

    const normalizedType = String(recipientType).toUpperCase();
    const allowed = ["USER", "RIDER", "VENDOR", "ADMIN"];
    if (!allowed.includes(normalizedType)) {
      return res.status(400).json({ error: "recipientType must be USER, RIDER, VENDOR, or ADMIN" });
    }

    let recipients = [];
    if (Array.isArray(userIds) && userIds.length) {
      recipients = await User.find({ _id: { $in: userIds } }).select("_id");
    } else if (normalizedType === "USER") {
      recipients = await User.find({ role: "user" }).select("_id");
    } else if (normalizedType === "RIDER") {
      recipients = await User.find({ role: "rider" }).select("_id");
    } else if (normalizedType === "VENDOR") {
      recipients = await User.find({ role: "vendor" }).select("_id");
    } else {
      recipients = await User.find({ role: "admin" }).select("_id");
    }

    await Promise.all(recipients.map((recipient) => sendNotification({
      recipientId: recipient._id,
      recipientType: normalizedType,
      title,
      body,
      data: { announcement: "true" },
      eventType: "APP_ANNOUNCEMENT",
      deepLink: "/",
      type: "ALERT",
      category: "systemAlerts",
      io: req.app.get("io"),
    })));

    return res.json({ success: true, recipientCount: recipients.length });
  } catch (error) {
    console.error("Announcement send error:", error);
    return res.status(500).json({ error: "Failed to broadcast announcement" });
  }
});

export default router;
