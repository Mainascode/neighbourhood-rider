import express from "express";
import Inquiry from "../../models/Inquiry.js";
import Order from "../../models/Order.js";
import Payment from "../../models/Payment.js";
import Rider from "../../models/Rider.js";
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
    const activeRiders = await Rider.countDocuments({ isOnline: true });

    const [recentOrders, awaitingConfirmationDetails, unpaidOrderDetails, recentCustomers, activeRiderDetails, recentInquiries] = await Promise.all([
      Order.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("userId", "name email")
        .populate("riderId", "name phone")
        .lean(),
      Order.find({ status: "AWAITING_CONFIRMATION" })
        .sort({ updatedAt: -1 })
        .limit(8)
        .populate("userId", "name email")
        .lean(),
      Order.find({ paid: false })
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("userId", "name email")
        .lean(),
      User.find({ role: "user" })
        .sort({ createdAt: -1 })
        .limit(8)
        .select("name email phone location createdAt")
        .lean(),
      Rider.find({ isOnline: true })
        .sort({ lastSeen: -1 })
        .limit(8)
        .populate("userId", "name email phone")
        .lean(),
      Inquiry.find()
        .sort({ timestamp: -1 })
        .limit(8)
        .lean(),
    ]);

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
      activeRiders,
      totalRevenue: totalRevenue[0]?.total || 0,
      isRaining: Boolean(settings.isRaining),
      details: {
        totalOrders: {
          title: "Recent Orders",
          subtitle: "Use this list for dashboard popups with the latest order activity.",
          items: recentOrders.map((order) => ({
            id: String(order._id),
            status: order.status,
            customerName: order.userId?.name || "Unknown customer",
            customerEmail: order.userId?.email || "",
            riderName: order.riderId?.name || "",
            riderPhone: order.riderId?.phone || "",
            pickupAddress: order.pickup?.address || "",
            dropoffAddress: order.dropoff?.address || "",
            total: Number(order.finalTotal || order.amount || 0),
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          })),
        },
        awaitingConfirmationOrders: {
          title: "Awaiting Confirmation",
          subtitle: "Orders waiting on the customer to review and approve pricing.",
          items: awaitingConfirmationDetails.map((order) => ({
            id: String(order._id),
            customerName: order.userId?.name || "Unknown customer",
            customerEmail: order.userId?.email || "",
            total: Number(order.finalTotal || order.amount || 0),
            deliveryFee: Number(order.deliveryFee || 0),
            updatedAt: order.updatedAt,
          })),
        },
        unpaidOrders: {
          title: "Unpaid Orders",
          subtitle: "Useful for a quick popup of orders still waiting for payment.",
          items: unpaidOrderDetails.map((order) => ({
            id: String(order._id),
            status: order.status,
            customerName: order.userId?.name || "Unknown customer",
            customerEmail: order.userId?.email || "",
            total: Number(order.finalTotal || order.amount || 0),
            createdAt: order.createdAt,
          })),
        },
        customers: {
          title: "Newest Customers",
          subtitle: "Recent customer signups and contact details.",
          items: recentCustomers.map((customer) => ({
            id: String(customer._id),
            name: customer.name || "Unnamed customer",
            email: customer.email || "",
            phone: customer.phone || "",
            location: customer.location || "",
            createdAt: customer.createdAt,
          })),
        },
        riders: {
          title: "Active Riders",
          subtitle: "Online riders available for immediate follow-up from the dashboard popup.",
          items: activeRiderDetails.map((rider) => ({
            id: String(rider._id),
            name: rider.name || rider.userId?.name || "Unnamed rider",
            email: rider.userId?.email || "",
            phone: rider.phone || rider.userId?.phone || "",
            status: rider.status,
            currentOrders: Number(rider.currentOrders || 0),
            lastSeen: rider.lastSeen,
            approvalStatus: rider.approvalStatus,
          })),
        },
        inquiries: {
          title: "Recent Inquiries",
          subtitle: "Messages that can be opened in a small detail popup on the admin side.",
          items: recentInquiries.map((inquiry) => ({
            id: String(inquiry._id),
            email: inquiry.email || "",
            subject: inquiry.subject || "General Inquiry",
            message: inquiry.message || inquiry.summary || "",
            location: inquiry.location || "",
            status: inquiry.status || "unread",
            timestamp: inquiry.timestamp,
          })),
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Admin dashboard error" });
  }
});

export default router;
