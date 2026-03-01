import express from "express";
import Order from "../../models/Order.js";
import Rider from "../../models/Rider.js";
import Payment from "../../models/Payment.js";
import Vendor from "../../models/Vendor.js";
import User from "../../models/User.js";

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

    const activeRiders = await Rider.countDocuments({ isOnline: true });
    const totalRiders = await Rider.countDocuments(); // Total registered riders
    const totalVendors = await Vendor.countDocuments(); // Total registered vendors
    const totalUsers = await User.countDocuments({ role: "user" }); // Total customers

    const totalRevenue = await Payment.aggregate([
      { $match: { status: "PAID" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      totalOrders,
      unpaidOrders,
      activeRiders,
      totalRiders,
      totalVendors,
      totalUsers,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Admin dashboard error" });
  }
});

export default router;
