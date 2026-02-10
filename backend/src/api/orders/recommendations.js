import express from "express";
import Order from "../../models/Order.js";
import Vendor from "../../models/Vendor.js";

const router = express.Router();

// GET /api/orders/recommendations
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user._id,
      status: { $nin: ["CANCELLED", "REFUNDED"] }
    })
      .select("vendorId items")
      .lean();

    if (!orders.length) return res.json({ vendors: [], items: [] });

    const vendorCounts = new Map();
    const itemCounts = new Map();

    for (const order of orders) {
      const vendorId = order.vendorId ? order.vendorId.toString() : null;
      if (vendorId) {
        vendorCounts.set(vendorId, (vendorCounts.get(vendorId) || 0) + 1);
      }

      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          if (!item || !item.name) continue;
          const key = `${vendorId || "unknown"}:${item.name}`;
          const existing = itemCounts.get(key) || {
            vendorId,
            itemId: item._id,
            name: item.name,
            price: item.price,
            image: item.image,
            count: 0
          };
          existing.count += 1;
          itemCounts.set(key, existing);
        }
      }
    }

    const topVendors = [...vendorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([vendorId, count]) => ({ vendorId, count }));

    const vendorIds = topVendors.map(v => v.vendorId).filter(Boolean);
    const vendors = vendorIds.length
      ? await Vendor.find({ _id: { $in: vendorIds } }).select("storeName").lean()
      : [];

    const vendorNameById = new Map(
      vendors.map(v => [v._id.toString(), v.storeName])
    );

    const items = [...itemCounts.values()]
      .filter(i => !vendorIds.length || vendorIds.includes(i.vendorId))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
      .map(i => ({
        ...i,
        vendorName: vendorNameById.get(i.vendorId) || i.vendorName || "Vendor"
      }));

    const vendorsOut = topVendors.map(v => ({
      vendorId: v.vendorId,
      count: v.count,
      vendorName: vendorNameById.get(v.vendorId) || "Vendor"
    }));

    res.json({ vendors: vendorsOut, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch recommendations" });
  }
});

export default router;
