import mongoose from "mongoose";

const OrderStatusLogSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    fromStatus: { type: String, required: true },
    toStatus: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String },
    actorName: { type: String },
    source: { type: String },
    reason: { type: String },
  },
  { timestamps: true }
);

OrderStatusLogSchema.index({ orderId: 1, createdAt: -1 });

export default mongoose.models.OrderStatusLog ||
  mongoose.model("OrderStatusLog", OrderStatusLogSchema);
