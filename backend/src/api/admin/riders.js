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
            { status },
            { new: true }
        );

        if (rider && rider.userId) {
            const newRole = status === "approved" ? "rider" : "user";
            await User.findByIdAndUpdate(rider.userId, { role: newRole });
        }
        res.json(rider);
    } catch (err) {
        res.status(500).json({ error: "Failed to update rider status" });
    }
});

export default router;
