import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", required: true },
    type: {
        type: String,
        enum: ["deposit", "withdrawal", "earning", "commission_deduction", "delivery_fee", "service_fee"],
        required: true
    },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
    referenceId: { type: String }, // Order ID or M-Pesa Transaction ID
    description: { type: String },
    metadata: { type: Object } // Extra details
}, { timestamps: true });

export default mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);
