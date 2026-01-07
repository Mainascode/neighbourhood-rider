import express from "express";
import Order from "../../models/Order.js";
import Rider from "../../models/Rider.js";
import Payment from "../../models/Payment.js";

const router = express.Router();

/**
 * GET /api/admin/dashboard
 * Admin overview
 */
router.get("/", async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const unpaidOrders = await Order.countDocuments({
      status: { $in: ["DELIVERED", "PAYMENT_PENDING"] },
    });

    const activeRiders = await Rider.countDocuments({ online: true });
    const totalRevenue = await Payment.aggregate([
      { $match: { status: "PAID" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      totalOrders,
      unpaidOrders,
      activeRiders,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Admin dashboard error" });
  }
});

export default router;
