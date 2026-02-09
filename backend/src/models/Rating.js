import mongoose from "mongoose";

const RatingSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Target (One of these should be set)
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider" },

    role: { type: String, enum: ["vendor", "rider"], required: true }, // Who is being rated

    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxLength: 500 },
}, { timestamps: true });

// Prevent duplicate ratings for same order/target
RatingSchema.index({ orderId: 1, role: 1 }, { unique: true });

export default mongoose.models.Rating || mongoose.model("Rating", RatingSchema);
