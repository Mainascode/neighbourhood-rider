import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
phone: { type: String, required: true },
amount: { type: Number, required: true },
status: { type: String, enum: ["pending", "initiated", "paid", "failed"], default: "pending" },
mpesaRef: { type: String, default: "" },
merchantRequestId: { type: String, default: "" },
checkoutRequestId: { type: String, default: "", index: true },
receiptNumber: { type: String, default: "" },
payload: { type: Object, default: {} }
}, { timestamps: true });

export default mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
