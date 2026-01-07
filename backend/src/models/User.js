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
  password: String,
  role: {
    type: String,
    enum: ["user", "admin", "rider"],
    default: "user",
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,


  refreshTokens: [refreshSchema],
});

export default mongoose.model("User", userSchema);
