import webpush from "web-push";
import Subscription from "../../models/Subscription.js";
import express from "express";
import requireAuth from "../../middleware/requireAuth.js";
import requireAdmin from "../../middleware/requireAdmin.js";

const router = express.Router();

function getConfiguredVapidPublicKey() {
    return (
        process.env.VAPID_PUBLIC_KEY ||
        process.env.REACT_APP_VAPID_PUBLIC_KEY ||
        ""
    ).trim();
}

// Configure VAPID (This will crash if keys aren't set, which is good for debugging)
if (getConfiguredVapidPublicKey() && process.env.VAPID_PRIVATE_KEY) {
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:mainaemmanuel855@gmail.com";
    webpush.setVapidDetails(
        vapidSubject,
        getConfiguredVapidPublicKey(),
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.warn("⚠️ customized VAPID keys not found. Push notifications will fail if not set.");
}

// @route   GET /api/notifications/vapid-public-key
// @desc    Returns public VAPID key for web push subscription
// @access  Public
router.get("/vapid-public-key", (_req, res) => {
    const key = getConfiguredVapidPublicKey();
    if (!key) {
        return res.status(500).json({
            error: "VAPID public key is not configured (expected VAPID_PUBLIC_KEY on backend)."
        });
    }
    return res.json({ publicKey: key });
});

// @route   POST /api/notifications/subscribe
// @desc    Register a user's browser for push notifications
// @access  Private (Logged in users)
router.post("/subscribe", requireAuth, async (req, res) => {
    try {
        const subscription = req.body;
        const userId = req.user.id;
        const role = req.user.role;

        console.log(`🔔 Subscribe: User ${userId} (${role})`);

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({ error: "Invalid subscription object" });
        }

        // Save to DB (upsert)
        await Subscription.findOneAndUpdate(
            { endpoint: subscription.endpoint },
            {
                userId: req.user._id,
                endpoint: subscription.endpoint,
                keys: subscription.keys,
            },
            { upsert: true, new: true }
        );

        res.status(201).json({ success: true });
    } catch (err) {
        console.error("Push Subscribe Error:", err);
        res.status(500).json({ error: "Failed to subscribe" });
    }
});

// @route   POST /api/notifications/send
// @desc    Send a push notification to a specific user (Admin Only)
// @access  Private (Admin)
router.post("/send", requireAuth, requireAdmin, async (req, res) => {
    try {
        const { userId, title, body, url } = req.body;

        const subscriptions = await Subscription.find({ userId });

        if (subscriptions.length === 0) {
            return res.status(404).json({ error: "User has no active subscriptions" });
        }

        const payload = JSON.stringify({
            title: title || "New Notification",
            body: body || "You have a new message.",
            url: url || "/",
        });

        // Send to all user's devices
        const promises = subscriptions.map((sub) =>
            webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys },
                payload
            ).catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription expired/gone, remove from DB
                    Subscription.deleteOne({ _id: sub._id }).exec();
                }
                return null;
            })
        );

        await Promise.all(promises);

        res.json({ success: true, sentTo: subscriptions.length });
    } catch (err) {
        console.error("Push Send Error:", err);
        res.status(500).json({ error: "Failed to send notification" });
    }
});

export default router;
