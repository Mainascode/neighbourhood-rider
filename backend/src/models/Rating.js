import mongoose from "mongoose";

const RatingSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    feedback: { type: String, maxLength: 500, default: "" },
}, { timestamps: true });

RatingSchema.index({ orderId: 1 }, { unique: true });

export default mongoose.models.Rating || mongoose.model("Rating", RatingSchema);
