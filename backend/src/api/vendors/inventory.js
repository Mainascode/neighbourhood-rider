
import Vendor from "../../models/Vendor.js";

/**
 * POST /api/vendors/inventory
 * Add new item to inventory
 */
export async function addItem(req, res) {
    try {
        const { name, price, image } = req.body;

        // Find vendor associated with this user
        const vendor = await Vendor.findOne({ userId: req.user._id });

        if (!vendor) {
            return res.status(404).json({ message: "Vendor profile not found" });
        }

        if (vendor.status !== "approved") {
            return res.status(403).json({ message: "Store not approved yet" });
        }

        vendor.inventory.push({ name, price, image });
        await vendor.save();

        res.json(vendor.inventory);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to add item" });
    }
}

/**
 * DELETE /api/vendors/inventory/:itemId
 * Remove item from inventory
 */
export async function removeItem(req, res) {
    try {
        const { itemId } = req.params;
        const vendor = await Vendor.findOne({ userId: req.user._id });

        if (!vendor) return res.status(404).json({ message: "Vendor not found" });

        vendor.inventory = vendor.inventory.filter(item => item._id.toString() !== itemId);
        await vendor.save();

        res.json(vendor.inventory);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to remove item" });
    }
}

/**
 * GET /api/vendors/inventory
 * Get inventory items
 */
export const getInventory = async (req, res) => {
    try {
        const vendor = await Vendor.findOne({ userId: req.user.id });
        if (!vendor) return res.status(404).json({ message: "Vendor profile not found" });

        res.json(vendor.inventory);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch inventory" });
    }
}

export default { addItem, removeItem, getInventory };
