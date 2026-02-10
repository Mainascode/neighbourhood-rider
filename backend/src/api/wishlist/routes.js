import express from "express";
import WishlistItem from "../../models/WishlistItem.js";

const router = express.Router();

// GET /api/wishlist
router.get("/", async (req, res) => {
  try {
    const items = await WishlistItem.find({ userId: req.user._id })
      .sort({ addedAt: -1 });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch wishlist" });
  }
});

// POST /api/wishlist
router.post("/", async (req, res) => {
  try {
    const { vendorId, vendorName, itemId, name, price, image } = req.body;

    if (!vendorId || !name) {
      return res.status(400).json({ message: "vendorId and name are required" });
    }

    const match = { userId: req.user._id, vendorId };
    if (itemId) {
      match.itemId = itemId;
    } else {
      match.name = name;
    }

    const existing = await WishlistItem.findOne(match);
    if (existing) return res.json(existing);

    const created = await WishlistItem.create({
      userId: req.user._id,
      vendorId,
      vendorName,
      itemId,
      name,
      price,
      image
    });

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add wishlist item" });
  }
});

// DELETE /api/wishlist/:id
router.delete("/:id", async (req, res) => {
  try {
    const removed = await WishlistItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!removed) return res.status(404).json({ message: "Item not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to remove wishlist item" });
  }
});

export default router;
