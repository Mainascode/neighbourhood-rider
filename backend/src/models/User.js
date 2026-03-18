import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  phone: { type: String, default: "" },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["user", "admin", "rider", "vendor"],
    default: "user",
  },
  location: { type: String, default: "Ruaka", index: true },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  freeDeliveryCredits: { type: Number, default: 0 },
  referralRewardGranted: { type: Boolean, default: false },
  hasCompletedOrder: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model("User", userSchema);
