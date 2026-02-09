
import Vendor from "../../models/Vendor.js";
import User from "../../models/User.js";

/**
 * PATCH /api/vendors/me
 * Update vendor profile details
 */
export async function updateVendor(req, res) {
    try {
        const { storeName, description, phone, location, address, logo, coverImage } = req.body;

        const vendor = await Vendor.findOne({ userId: req.user.id });

        if (!vendor) {
            return res.status(404).json({ message: "Vendor profile not found" });
        }

        // Update fields if provided
        if (storeName) vendor.storeName = storeName;
        if (description) vendor.description = description;
        if (phone) vendor.phone = phone;
        if (address) vendor.address = address;
        if (logo) vendor.logo = logo;
        if (coverImage) vendor.coverImage = coverImage;

        // isOpen is now handled automatically by virtual (06:00 - 21:00)

        // Handle location update if specific coordinates provided [lng, lat]
        if (location && Array.isArray(location) && location.length === 2) {
            vendor.location = { type: "Point", coordinates: location };
        }

        // If storeName changed, maybe we want to re-verify? For now, let's allow updates freely.

        await vendor.save();

        res.json(vendor);
    } catch (err) {
        console.error("Vendor Update Error:", err);
        res.status(500).json({ message: "Failed to update vendor profile", error: err.message });
    }
}

/**
 * DELETE /api/vendors/me
 * Permanently delete vendor profile
 */
export async function deleteVendor(req, res) {
    try {
        const vendor = await Vendor.findOne({ userId: req.user.id });

        if (!vendor) {
            return res.status(404).json({ message: "Vendor profile not found" });
        }

        // 1. Delete Vendor Profile
        await Vendor.deleteOne({ _id: vendor._id });

        // 2. Revert User Role to 'user'
        await User.findByIdAndUpdate(req.user.id, { role: 'user' });

        res.json({ message: "Shop deleted successfully. Your account is now a regular user account." });
    } catch (err) {
        console.error("Vendor Delete Error:", err);
        res.status(500).json({ message: "Failed to delete shop", error: err.message });
    }
}

/**
 * GET /api/vendors/me
 * Get current vendor profile
 */
export async function getVendorProfile(req, res) {
    try {
        const vendor = await Vendor.findOne({ userId: req.user.id });
        if (!vendor) return res.status(404).json({ message: "Vendor profile not found" });
        res.json(vendor);
    } catch (err) {
        console.error("Get Vendor Error:", err);
        res.status(500).json({ message: "Failed to fetch vendor profile" });
    }
}

export default { updateVendor, deleteVendor, getVendorProfile };
