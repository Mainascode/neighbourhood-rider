import mongoose from "mongoose";

const NotificationPreferenceSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true },
    recipientType: { type: String, enum: ["USER", "VENDOR", "RIDER"], required: true },
    orderUpdates: { type: Boolean, default: true },
    promotions: { type: Boolean, default: true },
    systemAlerts: { type: Boolean, default: true },
  },
  { timestamps: true }
);

NotificationPreferenceSchema.index({ recipientId: 1, recipientType: 1 }, { unique: true });

export default mongoose.models.NotificationPreference ||
  mongoose.model("NotificationPreference", NotificationPreferenceSchema);
