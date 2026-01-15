import Vendor from "../../models/Vendor.js";

/**
 * POST /api/vendors/register
 */
export default async function register(req, res) {
    try {
        // Check if user already has a vendor profile
        const existing = await Vendor.findOne({ userId: req.user.id });
        if (existing) {
            return res.status(400).json({ message: "Already registered as a vendor" });
        }

        const { storeName, description, phone, location, address, logo, coverImage } = req.body;

        if (!storeName || !phone) {
            return res.status(400).json({ message: "Store Name and Phone are required" });
        }

        const vendor = await Vendor.create({
            userId: req.user.id,
            storeName,
            description,
            phone,
            address,
            logo,
            coverImage,
            location: location ? { type: "Point", coordinates: location } : undefined, // Expected [lng, lat]
            status: "pending"
        });

        res.status(201).json(vendor);
    } catch (err) {
        console.error("Vendor Registration Error:", err);
        res.status(500).json({ message: "Vendor registration failed", error: err.message });
    }
}
