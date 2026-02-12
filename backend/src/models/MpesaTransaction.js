import mongoose from "mongoose";

const MpesaTransactionSchema = new mongoose.Schema(
  {
    checkoutRequestId: { type: String, required: true, unique: true },
    mpesaReceiptNumber: { type: String },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    amount: { type: Number },
    phoneNumber: { type: String },
    resultCode: { type: Number },
    resultDesc: { type: String },
    raw: { type: Object },
    processedAt: { type: Date },
    receivedAt: { type: Date, default: Date.now },
    sourceIp: { type: String },
  },
  { timestamps: true }
);

MpesaTransactionSchema.index({ mpesaReceiptNumber: 1 }, { unique: true, sparse: true });

export default mongoose.models.MpesaTransaction ||
  mongoose.model("MpesaTransaction", MpesaTransactionSchema);
