import express from "express";
import Rider from "../../models/Rider.js";
import User from "../../models/User.js";

const router = express.Router();

// GET all riders
router.get("/", async (req, res) => {
    try {
        const riders = await Rider.find().populate("userId", "name email");
        res.json(riders);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch riders" });
    }
});

// PATCH approve/reject rider
router.patch("/:id/approve", async (req, res) => {
    try {
        const { status } = req.body; // "approved" or "rejected"
        const rider = await Rider.findByIdAndUpdate(
            req.params.id,
            { approvalStatus: status },
            { new: true }
        );

        if (rider && rider.userId) {
            const newRole = status === "approved" ? "rider" : "user";
            if (status === "approved") {
                // 1. Send Push Notification
                await import("../../lib/push.js").then(({ sendPushNotification }) => {
                    sendPushNotification(
                        rider.userId,
                        "Application Approved! 🎉",
                        "You are now an official Rider. Log in to start earning!",
                        "/dashboard"
                    );
                });

                // 2. Mock SMS (Log to console)
                console.log(`[Twilio Mock] Sending SMS to ${rider.phone}: "Habari ${rider.name}, your application to Neighbourhood Rider has been APPROVED! Log in now to start. Welcome to the team!"`);
            }
            await User.findByIdAndUpdate(rider.userId, { role: newRole });
        }
        res.json(rider);
    } catch (err) {
        res.status(500).json({ error: "Failed to update rider status" });
    }
});

export default router;
