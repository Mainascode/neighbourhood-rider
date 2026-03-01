import mongoose from "mongoose";

const RiderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: String,
  phone: String,
  idNumber: String,
  idPicture: String, // URL or Base64
  riderPicture: String, // URL or Base64
  locationName: { type: String, default: "Ruaka", index: true },
  isOnline: { type: Boolean, default: false },
  socketId: { type: String, default: null },
  isAvailable: { type: Boolean, default: true },
  currentOrders: { type: Number, default: 0 },
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
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [lng, lat]
      default: [36.8219, -1.2921],
    },
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
RiderSchema.index({ isOnline: 1, lastSeen: -1 });
RiderSchema.index({ socketId: 1 }, { sparse: true });

export default mongoose.models.Rider ||
  mongoose.model("Rider", RiderSchema);
