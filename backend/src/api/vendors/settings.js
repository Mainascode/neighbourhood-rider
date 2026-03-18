
import Vendor from "../../models/Vendor.js";
import User from "../../models/User.js";
import { ok, fail } from "../../lib/response.js";
import { sendNotification } from "../../lib/notificationService.js";

/**
 * PATCH /api/vendors/me
 * Update vendor profile details
 */
export async function updateVendor(req, res) {
    try {
        const { storeName, description, phone, location, address, logo, coverImage, isManuallyClosed, isOpen, riderAcceptTimeoutSeconds } = req.body;

        const vendor = await Vendor.findOne({ userId: req.user.id });

        if (!vendor) {
            return fail(res, "Vendor profile not found", 404);
        }

        const previousOpenState = Boolean(vendor.isOpen && !vendor.isManuallyClosed);

        // Update fields if provided
        if (storeName) vendor.storeName = storeName;
        if (description) vendor.description = description;
        if (phone) vendor.phone = phone;
        if (address) vendor.address = address;
        if (logo) vendor.logo = logo;
        if (coverImage) vendor.coverImage = coverImage;

        // Manual close overrides time-based open status
        if (typeof isManuallyClosed === "boolean") {
            vendor.isManuallyClosed = isManuallyClosed;
            vendor.manualClosedAt = isManuallyClosed ? new Date() : null;
        }
        if (typeof isOpen === "boolean") {
            vendor.isOpen = isOpen;
        }

        if (riderAcceptTimeoutSeconds !== undefined) {
            vendor.riderAcceptTimeoutSeconds = riderAcceptTimeoutSeconds;
        }

        // Handle location update if specific coordinates provided [lng, lat]
        if (location && Array.isArray(location) && location.length === 2) {
            vendor.location = { type: "Point", coordinates: location };
        }

        // If storeName changed, maybe we want to re-verify? For now, let's allow updates freely.

        await vendor.save();

        const currentOpenState = Boolean(vendor.isOpen && !vendor.isManuallyClosed);
        if (currentOpenState && !previousOpenState) {
            const users = await User.find({
                role: "user",
                $or: [{ location: "Ruaka" }, { location: { $exists: false } }]
            }).select("_id");
            await Promise.all(users.map((u) => sendNotification({
                recipientId: u._id,
                recipientType: "USER",
                title: "Vendor is now open",
                body: "🛒 Vendors in Ruaka are open and ready",
                data: { vendorId: String(vendor._id), location: "Ruaka" },
                eventType: "VENDOR_OPEN_RUAKA",
                deepLink: "/order",
                type: "ALERT",
                category: "systemAlerts",
                io: req.app.get("io"),
            })));
        }

        return ok(res, vendor);
    } catch (err) {
        console.error("Vendor Update Error:", err);
        return fail(res, "Failed to update vendor profile", 500);
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
            return fail(res, "Vendor profile not found", 404);
        }

        // 1. Delete Vendor Profile
        await Vendor.deleteOne({ _id: vendor._id });

        // 2. Revert User Role to 'user'
        await User.findByIdAndUpdate(req.user.id, { role: 'user' });

        return ok(res, { message: "Shop deleted successfully. Your account is now a regular user account." });
    } catch (err) {
        console.error("Vendor Delete Error:", err);
        return fail(res, "Failed to delete shop", 500);
    }
}

/**
 * GET /api/vendors/me
 * Get current vendor profile
 */
export async function getVendorProfile(req, res) {
    try {
        const vendor = await Vendor.findOne({ userId: req.user.id });
        if (!vendor) return fail(res, "Vendor profile not found", 404);
        return ok(res, vendor);
    } catch (err) {
        console.error("Get Vendor Error:", err);
        return fail(res, "Failed to fetch vendor profile", 500);
    }
}

export default { updateVendor, deleteVendor, getVendorProfile };
