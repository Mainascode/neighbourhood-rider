import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    recipientType: {
      type: String,
      enum: ["USER", "VENDOR", "RIDER", "ADMIN"],
      required: true,
    },
    type: { type: String, enum: ["ALERT", "SILENT"], default: "ALERT" },
    eventType: { type: String },
    orderId: { type: String, default: "" },
    deepLink: { type: String, default: "" },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Object, default: {} },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, recipientType: 1, createdAt: -1 });

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
