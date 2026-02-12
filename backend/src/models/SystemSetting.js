import mongoose from "mongoose";

const SystemSettingSchema = new mongoose.Schema({
    key: { type: String, default: "global_config", unique: true }, // Singleton pattern
    riderBaseFee: { type: Number, default: 50 },
    riderPerKmFee: { type: Number, default: 30 },
    serviceFee: { type: Number, default: 30 },
    vendorCommissionRate: { type: Number, default: 0 }, // Percentage (0 - 100)
    riderAcceptTimeoutSeconds: { type: Number, default: 15 },
}, { timestamps: true });

export default mongoose.models.SystemSetting || mongoose.model("SystemSetting", SystemSettingSchema);
