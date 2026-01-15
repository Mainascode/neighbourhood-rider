
import Vendor from "../../models/Vendor.js";

/**
 * GET /api/vendors/nearby
 * List all approved vendors (public)
 * TODO: Filter by location in future
 */
export async function listPublicVendors(req, res) {
    try {
        const vendors = await Vendor.find({ status: "approved", isOpen: true }).populate("userId", "name");
        res.json(vendors);
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
