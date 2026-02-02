import mongoose from "mongoose";

const DistanceCacheSchema = new mongoose.Schema({
    pickup_area: { type: String, required: true }, // e.g. "Lat: -1.29, Lng: 36.82" (rounded)
    dropoff_area: { type: String, required: true },
    distance_km: { type: Number, required: true },
    duration: { type: String }, // e.g. "15 mins"
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 } // Cache for 30 days
});

// Compound index to ensure unique pairs
DistanceCacheSchema.index({ pickup_area: 1, dropoff_area: 1 }, { unique: true });

export default mongoose.models.DistanceCache || mongoose.model("DistanceCache", DistanceCacheSchema);
