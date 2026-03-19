// backend/src/models/User.js
import mongoose from "mongoose";

const refreshSchema = new mongoose.Schema({
  token: String,
  device: String,
  createdAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  authProvider: { type: String, enum: ["email", "google"], default: "email" },
  role: {
    type: String,
    enum: ["user", "admin", "rider", "vendor"],
    default: "user",
  },
  location: { type: String, default: "Ruaka - Gathigi Estate", index: true },
  privacyPolicyAcceptedAt: Date,
  termsAcceptedAt: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  fcmTokens: {
    type: [String],
    default: [],
  },


  refreshTokens: [refreshSchema],
});

export default mongoose.model("User", userSchema);
