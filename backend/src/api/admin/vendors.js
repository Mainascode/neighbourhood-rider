import Vendor from "../../models/Vendor.js";
import User from "../../models/User.js";

/**
 * GET /api/admin/vendors
 * List all vendors
 */
export async function listVendors(req, res) {
    try {
        const vendors = await Vendor.find().sort({ createdAt: -1 });
        res.json(vendors);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch vendors" });
    }
}

/**
 * PATCH /api/admin/vendors/:id/approve
 * Approve or Reject a vendor
 * Body: { status: 'approved' | 'rejected' }
 */
export async function updateVendorStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const vendor = await Vendor.findById(id);
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        vendor.status = status;
        if (status === "approved") {
            vendor.isOpen = true; // Auto-open on approval

            // Update the user role to 'vendor'
            await User.findByIdAndUpdate(vendor.userId, { role: "vendor" });
        } else {
            vendor.isOpen = false;
            // Revert user role if needed, or leave as 'user' if they were just an applicant
            // If they were already a vendor and got banned, we might want to downgrade them.
            // For now preventing upgrade is enough.
            await User.findByIdAndUpdate(vendor.userId, { role: "user" });
        }

        await vendor.save();

        res.json(vendor);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update vendor status" });
    }
}

export default { listVendors, updateVendorStatus };
