import express from "express";
import requireAuth from "../../middleware/requireAuth.js";
import Rating from "../../models/Rating.js";
import Order from "../../models/Order.js";
import Vendor from "../../models/Vendor.js";
import Rider from "../../models/Rider.js";
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
        if (!orderId || !targetId || !["vendor", "rider"].includes(role)) {
            return res.status(400).json({ message: "Invalid rating payload" });
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
            vendorId: role === 'vendor' ? targetId : undefined,
            riderId: role === 'rider' ? targetId : undefined,
            role,
            rating,
            comment
        });

        // Mark order as reviewed
        // If both vendor and rider are reviewed, we might want to mark 'isReviewed' as true? 
        // Or specific flags? For now, 'isReviewed' is a simple flag in Order.js
        order.isReviewed = true;
        await order.save();

        // --- Update Average Rating for Vendor/Rider ---
        const ratingMatchField = role === "vendor" ? "vendorId" : "riderId";
        const stats = await Rating.aggregate([
            { $match: { [ratingMatchField]: new mongoose.Types.ObjectId(targetId) } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" },
                    totalRatings: { $sum: 1 }
                }
            }
        ]);

        if (stats.length > 0) {
            const averageRating = parseFloat(stats[0].averageRating.toFixed(2));
            const totalRatings = stats[0].totalRatings;

            if (role === "vendor") {
                const recent = await Rating.find({ vendorId: targetId, role: "vendor" })
                    .sort({ createdAt: -1 })
                    .limit(50)
                    .select("rating createdAt");

                let weightedSum = 0;
                let weightTotal = 0;
                recent.forEach((r, idx) => {
                    const weight = idx < 10 ? 1.5 : 1.0;
                    weightedSum += r.rating * weight;
                    weightTotal += weight;
                });

                const vendorScore = weightTotal > 0 ? parseFloat((weightedSum / weightTotal).toFixed(2)) : 0;

                await Vendor.findByIdAndUpdate(targetId, {
                    "metrics.rating": averageRating,
                    "metrics.ratingCount": totalRatings,
                    "metrics.vendorScore": vendorScore,
                });
            } else {
                await Rider.findByIdAndUpdate(targetId, {
                    "metrics.rating": averageRating,
                    "metrics.ratingCount": totalRatings
                });
            }
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
        const reviews = await Rating.find({
            $or: [
                { vendorId: targetId },
                { riderId: targetId }
            ]
        })
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

        const stats = await Rating.aggregate([
            {
                $match: {
                    $or: [
                        { vendorId: new mongoose.Types.ObjectId(targetId) },
                        { riderId: new mongoose.Types.ObjectId(targetId) }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
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
