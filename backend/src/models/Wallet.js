import mongoose from "mongoose";

const WalletSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    role: { type: String, enum: ["rider", "vendor", "admin", "user"], required: true },
    balance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 }, // For uncleared funds
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);
