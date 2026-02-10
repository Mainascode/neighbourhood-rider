import Order from "../../models/Order.js";
import OrderStatusLog from "../../models/OrderStatusLog.js";
import Vendor from "../../models/Vendor.js";
import Rider from "../../models/Rider.js";
import { getStatusMessage } from "../../lib/orderStatus.js";

export default async function getOrderTimeline(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Authorization: owner, vendor owner, rider owner, or admin
    if (user?.role !== "admin") {
      let authorized = false;

      if (order.userId?.toString() === user?._id?.toString()) authorized = true;

      if (!authorized && user?.role === "vendor") {
        const vendor = await Vendor.findOne({ userId: user._id });
        if (vendor && order.vendorId?.toString() === vendor._id.toString()) authorized = true;
      }

      if (!authorized && user?.role === "rider") {
        const rider = await Rider.findOne({ userId: user._id });
        if (rider && order.riderId?.toString() === rider._id.toString()) authorized = true;
      }

      if (!authorized) {
        return res.status(403).json({ message: "Unauthorized" });
      }
    }

    const logs = await OrderStatusLog.find({ orderId: order._id })
      .sort({ createdAt: 1 })
      .lean();

    const timeline = logs.map((log) => ({
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      timestamp: log.createdAt,
      message: getStatusMessage(log.toStatus),
      actorRole: log.actorRole,
      actorName: log.actorName,
      reason: log.reason,
    }));

    res.json({ orderId: order._id, timeline });
  } catch (err) {
    console.error("Order timeline error:", err);
    res.status(500).json({ message: "Failed to fetch timeline" });
  }
}
