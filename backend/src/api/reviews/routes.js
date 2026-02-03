import express from "express";
import requireAuth from "../../middleware/requireAuth.js";
import Review from "../../models/Review.js";
import Order from "../../models/Order.js";
import User from "../../models/User.js";

const router = express.Router();

// Create a Review
router.post("/", requireAuth, async (req, res) => {
    try {
        const { orderId, targetId, targetRole, rating, comment } = req.body;
        const reviewerId = req.user._id;

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
        if (order.userId.toString() !== reviewerId) {
            return res.status(403).json({ message: "Unauthorized to review this order" });
        }

        // Check for existing review
        const existingReview = await Review.findOne({ orderId, targetId });
        if (existingReview) {
            return res.status(400).json({ message: "Review already submitted for this order" });
        }

        const review = await Review.create({
            orderId,
            reviewerId,
            targetId,
            targetRole,
            rating,
            comment
        });

        // Mark order as reviewed (optional, or just rely on Review existence)
        order.isReviewed = true;
        await order.save();

        // Real-time Notification
        const io = req.app.get("io");
        if (io) {
            // E.g., vendor:review:VENDOR_ID
            io.emit(`${targetRole}:review:${targetId}`, review);
        }

        res.status(201).json({ success: true, review });

    } catch (error) {
        console.error("[Review] Error creating review:", error);
        res.status(500).json({ message: "Failed to submit review" });
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
