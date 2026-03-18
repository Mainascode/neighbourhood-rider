import mongoose from "mongoose";

const payoutBatchSchema = new mongoose.Schema({
    status: { type: String, enum: ["processing", "completed", "failed"], default: "processing" },
    totalAmount: { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 },
    successfulCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    logs: [{ type: String }],
    transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }],
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
});

export default mongoose.model("PayoutBatch", payoutBatchSchema);
