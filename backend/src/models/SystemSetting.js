import mongoose from "mongoose";

const SystemSettingSchema = new mongoose.Schema({
    key: { type: String, default: "global_config", unique: true },
    weather: { type: String, enum: ["sunny", "rainy"], default: "sunny" },
    isRaining: { type: Boolean, default: false },
    referralUnlockCount: { type: Number, default: 2 },
    referralRewardCredits: { type: Number, default: 1 },
}, { timestamps: true });

export default mongoose.models.SystemSetting || mongoose.model("SystemSetting", SystemSettingSchema);
