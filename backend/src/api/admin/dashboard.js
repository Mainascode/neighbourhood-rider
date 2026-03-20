import express from "express";
import Order from "../../models/Order.js";
import Payment from "../../models/Payment.js";
import User from "../../models/User.js";
import SystemSetting from "../../models/SystemSetting.js";

const router = express.Router();

/**
 * GET /api/admin/dashboard
 * Admin overview
 */
router.get("/", async (req, res) => {
  try {
    let settings = await SystemSetting.findOne({ key: "global_config" });
    if (!settings) {
      settings = await SystemSetting.create({});
    }

    const totalOrders = await Order.countDocuments();
    const draftOrders = await Order.countDocuments({ status: "DRAFT" });
    const awaitingConfirmationOrders = await Order.countDocuments({ status: "AWAITING_CONFIRMATION" });
    const unpaidOrders = await Order.countDocuments({
      paid: false,
    });
    const totalUsers = await User.countDocuments({ role: "user" }); // Total customers
    const paidOrders = await Order.countDocuments({ paid: true });
    const processingOrders = await Order.countDocuments({ status: { $in: ["PAID", "SHOPPING", "DELIVERING", "PROCESSING", "ON_THE_WAY"] } });
    const completedOrders = await Order.countDocuments({ status: "DELIVERED" });

    const totalRevenue = await Payment.aggregate([
      { $match: { status: "PAID" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      totalOrders,
      draftOrders,
      awaitingConfirmationOrders,
      unpaidOrders,
      totalUsers,
      paidOrders,
      processingOrders,
      completedOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      isRaining: Boolean(settings.isRaining),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Admin dashboard error" });
  }
});

export default router;
