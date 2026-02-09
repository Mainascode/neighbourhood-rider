import express from "express";
import requireAuth from "../../middleware/requireAuth.js";
import Rating from "../../models/Rating.js";
import Order from "../../models/Order.js";
import User from "../../models/User.js";
import mongoose from "mongoose";

const router = express.Router();

// Create a Rating
router.post("/", requireAuth, async (req, res) => {
    try {
        const { orderId, targetId, role, rating, comment } = req.body; // role = 'vendor' or 'rider'
        const userId = req.user._id;

        // Validation
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Invalid rating (1-5)" });
        }

        // Verify Order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Check if user is the one who placed the order
        if (order.userId.toString() !== userId) {
            return res.status(403).json({ message: "Unauthorized to review this order" });
        }

        // Check for existing rating
        const existingRating = await Rating.findOne({ orderId, role });
        if (existingRating) {
            return res.status(400).json({ message: "Rating already submitted for this target" });
        }

        const newRating = await Rating.create({
            orderId,
            userId,
            vendorId: role === 'vendor' ? targetId : undefined,
            riderId: role === 'rider' ? targetId : undefined,
            role,
            rating,
            comment
        });

        // Mark order as reviewed
        // If both vendor and rider are reviewed, we might want to mark 'isReviewed' as true? 
        // Or specific flags? For now, 'isReviewed' is a simple flag in Order.js
        if (role === 'vendor') order.isReviewed = true;
        await order.save();


        // --- Update Average Rating for Vendor/Rider ---
        const Model = role === 'vendor' ? require("../../models/Vendor.js").default : require("../../models/Rider.js").default;

        // Calculate new Average
        const stats = await Rating.aggregate([
            { $match: { [role === 'vendor' ? 'vendorId' : 'riderId']: new mongoose.Types.ObjectId(targetId) } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" },
                    totalRatings: { $sum: 1 }
                }
            }
        ]);

        if (stats.length > 0) {
            await Model.findByIdAndUpdate(targetId, {
                'metrics.rating': parseFloat(stats[0].averageRating.toFixed(2)),
                'metrics.ratingCount': stats[0].totalRatings
            });
        }

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
        const reviews = await Review.find({ targetId })
            .populate("reviewerId", "name") // Show reviewer name
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

        const stats = await Review.aggregate([
            { $match: { targetId: new mongoose.Types.ObjectId(targetId) } },
            {
                $group: {
                    _id: "$targetId",
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 }
                }
            }
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
