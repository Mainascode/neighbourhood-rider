import mongoose from "mongoose";

const DeviceTokenSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true },
    recipientType: {
      type: String,
      enum: ["USER", "VENDOR", "RIDER", "ADMIN"],
      required: true,
    },
    deviceToken: { type: String, required: true },
    platform: { type: String, enum: ["ios", "android", "web"], required: true },
  },
  { timestamps: true }
);

DeviceTokenSchema.index({ recipientId: 1, recipientType: 1, deviceToken: 1 }, { unique: true });

export default mongoose.models.DeviceToken ||
  mongoose.model("DeviceToken", DeviceTokenSchema);
