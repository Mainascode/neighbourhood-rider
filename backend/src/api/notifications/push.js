import webpush from "web-push";
import Subscription from "../../models/Subscription.js";
import express from "express";
import requireAuth from "../../middleware/requireAuth.js";
import requireAdmin from "../../middleware/requireAdmin.js";

const router = express.Router();

// Configure VAPID (This will crash if keys aren't set, which is good for debugging)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        "mailto:mainaemmanuel855@gmail.com",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.warn("⚠️ customized VAPID keys not found. Push notifications will fail if not set.");
}

// @route   POST /api/notifications/subscribe
// @desc    Register a user's browser for push notifications
// @access  Private (Logged in users)
router.post("/subscribe", requireAuth, async (req, res) => {
    try {
        const subscription = req.body;

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
