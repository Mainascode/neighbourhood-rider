import Order from "../../models/Order.js";
import Rider from "../../models/Rider.js";
import { sendNotification } from "../../lib/notificationService.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (req.user.role !== "rider") {
      return res.status(403).json({ message: "Only riders can mark unreachable" });
    }

    if (!order.riderId) {
      return res.status(400).json({ message: "Order has no rider assigned" });
    }

    const riderProfile = await Rider.findOne({ userId: req.user._id });
    if (!riderProfile || riderProfile._id.toString() !== order.riderId.toString()) {
      return res.status(403).json({ message: "Not assigned to this order" });
    }

    await sendNotification({
      recipientId: req.user._id,
      recipientType: "RIDER",
      title: "Customer unreachable",
      body: "Customer is unreachable. Please follow escalation steps.",
      data: { orderId: String(order._id), eventType: "CUSTOMER_UNREACHABLE", deepLink: "/rider/dashboard" },
      eventType: "CUSTOMER_UNREACHABLE",
      deepLink: "/rider/dashboard",
      orderId: String(order._id),
      type: "ALERT",
      category: "systemAlerts",
      io: req.app.get("io"),
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Unreachable error:", err);
    res.status(500).json({ message: "Failed to mark unreachable" });
  }
}
