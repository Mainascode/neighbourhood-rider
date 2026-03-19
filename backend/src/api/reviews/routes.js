import express from "express";
import requireAuth from "../../middleware/requireAuth.js";
import Rating from "../../models/Rating.js";
import Order from "../../models/Order.js";
import { notifyAdmin, notifyUser } from "../../lib/notificationService.js";
import mongoose from "mongoose";

const router = express.Router();

// Create a Rating
router.post("/", requireAuth, async (req, res) => {
    try {
        const { orderId, rating, comment } = req.body;
        const userId = req.user._id;

        // Validation
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Invalid rating (1-5)" });
        }
        if (!orderId) {
            return res.status(400).json({ message: "Invalid rating payload" });
        }

        // Verify Order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Check if user is the one who placed the order
        if (order.userId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Unauthorized to review this order" });
        }

        const status = String(order.status || "").toUpperCase();
        if (status !== "DELIVERED") {
            return res.status(400).json({ message: "Order must be delivered before rating" });
        }

        // Check for existing rating (one rating per order)
        const existingRating = await Rating.findOne({ orderId });
        if (existingRating) {
            return res.status(400).json({ message: "Rating already submitted for this order" });
        }

        const newRating = await Rating.create({
            orderId,
            userId,
            role: "order",
            rating,
            comment
        });

        // Mark order as reviewed
        // If both vendor and rider are reviewed, we might want to mark 'isReviewed' as true? 
        // Or specific flags? For now, 'isReviewed' is a simple flag in Order.js
        order.isReviewed = true;
        await order.save();

        await notifyAdmin({
            title: "New order rating",
            body: `Order #${String(orderId).slice(-6)} received a ${rating}/5 rating.`,
            orderId: String(orderId),
            deepLink: "/admin/dashboard",
            eventType: "ORDER_RATING",
        });
        await notifyUser({
            recipientId: userId,
            title: "Rating saved",
            body: "Thanks for rating your Neighbourhood Rider order.",
            orderId: String(orderId),
            eventType: "ORDER_RATING_SAVED",
        });

        res.status(201).json({ success: true, rating: newRating });

    } catch (error) {
        console.error("[Rating] Error creating rating:", error);
        res.status(500).json({ message: "Failed to submit rating" });
    }
});

// Get Reviews for a Target (Vendor/Rider)
router.get("/:targetId", async (req, res) => {
    try {
        const { targetId } = req.params;
        const reviews = await Rating.find({ orderId: targetId })
            .populate("userId", "name")
            .sort({ createdAt: -1 })
            .limit(20);

        res.json(reviews);
    } catch (error) {
        console.error("[Review] Error fetching reviews:", error);
        res.status(500).json({ message: "Failed to fetch reviews" });
    }
});

// Get Stats (Average Rating)
router.get("/stats/:targetId", async (req, res) => {
    try {
        const { targetId } = req.params;
        const matchOrderId = mongoose.Types.ObjectId.isValid(targetId)
            ? new mongoose.Types.ObjectId(targetId)
            : targetId;

        const stats = await Rating.aggregate([
            { $match: { orderId: matchOrderId } },
            { $group: { _id: null, averageRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } }
        ]);

        if (stats.length === 0) {
            return res.json({ averageRating: 0, totalReviews: 0 });
        }

        res.json({
            averageRating: parseFloat(stats[0].averageRating.toFixed(1)),
            totalReviews: stats[0].totalReviews
        });

    } catch (error) {
        console.error("[Review] Error fetching review stats:", error);
        res.status(500).json({ message: "Failed to fetch stats" });
    }
});

export default router;
