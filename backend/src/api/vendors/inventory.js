
import Vendor from "../../models/Vendor.js";
import { generateProductImageDataUrl } from "../../lib/openaiImage.js";
import { getFirestore } from "../../lib/firebaseAdmin.js";

/**
 * POST /api/vendors/inventory
 * Add new item to inventory
 */
export async function addItem(req, res) {
    try {
        if (!req.user?._id) return res.status(401).json({ message: "Unauthorized" });
        if (req.user?.role !== "vendor" && req.user?.role !== "admin") {
            return res.status(403).json({ message: "Only authenticated vendors can add products" });
        }

        const { name, price, image, autoGenerateImage, imageCategory } = req.body;
        if (!name || price === undefined || price === null || String(price).trim() === "") {
            return res.status(400).json({ message: "Item name and price are required" });
        }

        // Find vendor associated with this user
        const vendor = await Vendor.findOne({ userId: req.user._id });

        if (!vendor) {
            return res.status(404).json({ message: "Vendor profile not found" });
        }

        if (vendor.status !== "approved") {
            return res.status(403).json({ message: "Store not approved yet" });
        }

        let finalImage = image;
        if (!finalImage && autoGenerateImage) {
            finalImage = await generateProductImageDataUrl({
                productName: name,
                category: imageCategory || "food",
            });
        }

        const numericPrice = Number(price);
        vendor.inventory.push({ name, price: numericPrice, image: finalImage || "" });
        await vendor.save();

        // Mirror product in Firestore for Firebase-native product feeds.
        const firestore = getFirestore();
        await firestore.collection("products").add({
            name: String(name).trim(),
            price: numericPrice,
            description: "",
            imageUrl: finalImage || "",
            vendorId: String(req.user._id),
            createdAt: new Date(),
        });

        res.json(vendor.inventory);
    } catch (err) {
        console.error(err);
        if (String(err?.message || "").includes("OPENAI_API_KEY")) {
            return res.status(400).json({ message: "OPENAI_API_KEY is missing. Set it to use AI image generation." });
        }
        res.status(500).json({ message: err.message || "Failed to add item" });
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
