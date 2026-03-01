import mongoose from "mongoose";

const PaymentEventLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: ["STK_INIT_FAILED", "CALLBACK_FAILED", "CALLBACK_PAYMENT_FAILED", "CALLBACK_AUTH_FAILED", "STK_INIT_SUCCESS"],
      required: true,
    },
    checkoutRequestId: { type: String },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    resultCode: { type: Number },
    resultDesc: { type: String },
    sourceIp: { type: String },
    attempts: { type: Number, default: 1 },
    lastError: { type: String },
    raw: { type: Object },
  },
  { timestamps: true }
);

PaymentEventLogSchema.index({ eventType: 1, createdAt: -1 });
PaymentEventLogSchema.index({ checkoutRequestId: 1, eventType: 1 });
PaymentEventLogSchema.index({ orderId: 1, createdAt: -1 });

export default mongoose.models.PaymentEventLog ||
  mongoose.model("PaymentEventLog", PaymentEventLogSchema);
