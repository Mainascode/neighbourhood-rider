import mongoose from "mongoose";

const RiderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: String,
  phone: String,
  idNumber: String,
  idPicture: String, // URL or Base64
  riderPicture: String, // URL or Base64
  isAvailable: { type: Boolean, default: true },
  approvalStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  status: {
    type: String,
    enum: ["OFFLINE", "ONLINE_AVAILABLE", "ONLINE_BUSY"],
    default: "OFFLINE",
  },
  vehicleType: {
    type: String,
    enum: ["electric_motorcycle", "bicycle"],
    default: "electric_motorcycle"
  },
  location: {
    type: { type: String, enum: ["Point"] },
    coordinates: [Number], // [lng, lat]
  },
  lastSeen: Date,
  lastOfflineReason: { type: String },
  isVerified: { type: Boolean, default: false },
  metrics: {
    rating: { type: Number, default: 5.0 },
    ratingCount: { type: Number, default: 0 },
  },
  penalties: {
    latePickupCount: { type: Number, default: 0 },
    lateDeliveryCount: { type: Number, default: 0 },
    overdueDeliveryCount: { type: Number, default: 0 },
    rejectionCount: { type: Number, default: 0 },
    assignmentCount: { type: Number, default: 0 },
    rejectionRate: { type: Number, default: 0 },
    isDisabled: { type: Boolean, default: false },
    disabledAt: { type: Date },
    disabledReason: { type: String },
    lastPenaltyAt: { type: Date },
  },
}, { timestamps: true });

RiderSchema.index({ location: "2dsphere" });
RiderSchema.index({ phone: 1 }, { sparse: true });

export default mongoose.models.Rider ||
  mongoose.model("Rider", RiderSchema);
