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
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

RiderSchema.index({ location: "2dsphere" });

export default mongoose.models.Rider ||
  mongoose.model("Rider", RiderSchema);
