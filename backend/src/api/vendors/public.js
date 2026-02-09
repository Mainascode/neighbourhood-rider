
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

        // Check System Hours (06:00 - 21:00)
        if (currentHour < 6 || currentHour >= 21) {
            return res.json({
                systemClosed: true,
                message: "Vendors operate between 6:00 AM and 9:00 PM",
                vendors: []
            });
        }

        // Virtuals cannot be queried in MongoDB, so we fetch all approved and filter in JS
        const vendors = await Vendor.find({ status: "approved" }).populate("userId", "name");

        // Filter by the virtual 'isOpen' property logic (redundant if system is open, but good for safety)
        // Actually, if system is open, all valid vendors should be "open" based on the fix hours logic.
        // But we'll keep the filter just in case logic changes.
        const openVendors = vendors.filter(v => v.isOpen);

        res.json({ systemClosed: false, vendors: openVendors });
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
