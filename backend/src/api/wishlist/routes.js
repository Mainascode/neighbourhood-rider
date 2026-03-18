import express from "express";
import WishlistItem from "../../models/WishlistItem.js";
import { ok, fail } from "../../lib/response.js";

const router = express.Router();

// GET /api/wishlist
router.get("/", async (req, res) => {
  try {
    const items = await WishlistItem.find({ userId: req.user._id })
      .sort({ addedAt: -1 });
    return ok(res, items);
  } catch (err) {
    console.error(err);
    return fail(res, "Failed to fetch wishlist", 500);
  }
});

// POST /api/wishlist
router.post("/", async (req, res) => {
  try {
    const { vendorId, vendorName, itemId, name, price, image } = req.body;

    if (!vendorId || !name) {
      return fail(res, "vendorId and name are required", 400);
    }

    const match = { userId: req.user._id, vendorId };
    if (itemId) {
      match.itemId = itemId;
    } else {
      match.name = name;
    }

    const existing = await WishlistItem.findOne(match);
    if (existing) return ok(res, existing);

    const created = await WishlistItem.create({
      userId: req.user._id,
      vendorId,
      vendorName,
      itemId,
      name,
      price,
      image
    });

    return ok(res, created, 201);
  } catch (err) {
    console.error(err);
    return fail(res, "Failed to add wishlist item", 500);
  }
});

// DELETE /api/wishlist/:id
router.delete("/:id", async (req, res) => {
  try {
    const removed = await WishlistItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!removed) return fail(res, "Item not found", 404);
    return ok(res, { removed: true });
  } catch (err) {
    console.error(err);
    return fail(res, "Failed to remove wishlist item", 500);
  }
});

export default router;
