
import Vendor from "../../models/Vendor.js";

/**
 * GET /api/vendors/nearby
 * List all approved vendors (public)
 * TODO: Filter by location in future
 */
export async function listPublicVendors(req, res) {
    try {
        const now = new Date();
        const currentHour = now.getHours();

        const systemClosed = currentHour < 6 || currentHour >= 21;

        // Virtuals cannot be queried in MongoDB, so we fetch all approved and filter in JS
        const vendors = await Vendor.find({ status: "approved" }).populate("userId", "name");

        res.json({
            systemClosed,
            message: systemClosed ? "Late orders available. Some payouts process next day." : undefined,
            vendors
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch vendors" });
    }
}

/**
 * GET /api/vendors/:id/public
 * Get specific vendor details + inventory (public)
 */
export async function getPublicVendorDetails(req, res) {
    try {
        const { id } = req.params;
        const vendor = await Vendor.findById(id).populate("userId", "name");

        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        res.json(vendor);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch vendor details" });
    }
}

export default { listPublicVendors, getPublicVendorDetails };
