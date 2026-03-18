import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Vendor or Rider ID
    targetRole: { type: String, enum: ["vendor", "rider"], required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, maxLength: 500 },
}, { timestamps: true });

// Prevent multiple reviews for same order/target (handled by orderId unique, but good to be explicit)
ReviewSchema.index({ orderId: 1, targetId: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema);
