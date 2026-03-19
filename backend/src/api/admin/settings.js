import SystemSetting from "../../models/SystemSetting.js";

/**
 * GET /api/admin/settings
 * Fetch global system settings
 */
export async function getSystemSettings(req, res) {
    try {
        let settings = await SystemSetting.findOne({ key: "global_config" });
        if (!settings) {
            settings = await SystemSetting.create({});
        }
        res.json(settings);
    } catch (err) {
        console.error("Get Settings Error:", err);
        res.status(500).json({ message: "Failed to fetch settings" });
    }
}

/**
 * PUT /api/admin/settings
 * Update global system settings
 */
export async function updateSystemSettings(req, res) {
    try {
        const { riderBaseFee, riderPerKmFee, serviceFee, vendorCommissionRate, riderAcceptTimeoutSeconds, isRaining } = req.body;

        let settings = await SystemSetting.findOne({ key: "global_config" });
        if (!settings) {
            settings = new SystemSetting();
        }

        if (riderBaseFee !== undefined) settings.riderBaseFee = riderBaseFee;
        if (riderPerKmFee !== undefined) settings.riderPerKmFee = riderPerKmFee;
        if (serviceFee !== undefined) settings.serviceFee = serviceFee;
        if (vendorCommissionRate !== undefined) settings.vendorCommissionRate = vendorCommissionRate;
        if (riderAcceptTimeoutSeconds !== undefined) settings.riderAcceptTimeoutSeconds = riderAcceptTimeoutSeconds;
        if (isRaining !== undefined) settings.isRaining = Boolean(isRaining);

        await settings.save();
        res.json(settings);
    } catch (err) {
        console.error("Update Settings Error:", err);
        res.status(500).json({ message: "Failed to update settings" });
    }
}

export default { getSystemSettings, updateSystemSettings };
