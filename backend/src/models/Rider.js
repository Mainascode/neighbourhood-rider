import mongoose from "mongoose";

const RiderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: String,
  phone: String,
  idNumber: String,
  idPicture: String, // URL or Base64
  riderPicture: String, // URL or Base64
  isAvailable: { type: Boolean, default: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  vehicleType: {
    type: String,
    enum: ["electric_motorcycle", "bicycle"],
    default: "electric_motorcycle"
  },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: [Number],
  },
}, { timestamps: true });

export default mongoose.models.Rider ||
  mongoose.model("Rider", RiderSchema);
