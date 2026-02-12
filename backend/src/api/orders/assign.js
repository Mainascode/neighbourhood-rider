import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import Rider from "../../models/Rider.js";
import { sendNotification } from "../../lib/notificationService.js";
import { updateOrderStatus, ORDER_STATUS } from "../../lib/orderStatus.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await connectDB();

    const { orderId, riderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    await updateOrderStatus({
      orderId: order._id,
      fromStatusRaw: order.status,
      toStatus: ORDER_STATUS.RIDER_ASSIGNED,
      actor: { id: req.user?._id, role: req.user?.role, name: req.user?.name },
      source: "orders.assign",
      io: req.app.get("io"),
      set: { riderId, riderAssignedAt: new Date() },
    });

    await Rider.findByIdAndUpdate(riderId, {
      isAvailable: false,
      status: "ONLINE_BUSY",
    });

    // 3. Notify Rider via Socket
    const io = req.app.get("io");
    if (io) {
      const { getRiderAcceptTimeoutSeconds } = await import("../../lib/riderConfig.js");
      const acceptSeconds = await getRiderAcceptTimeoutSeconds(orderId);
      io.emit(`rider:order:${riderId}`, {
        _id: orderId,
        status: ORDER_STATUS.RIDER_ASSIGNED,
        message: "You have been assigned a new order! 📦",
        acceptBy: Date.now() + (Math.max(5, Number(acceptSeconds || 15)) * 1000)
      });
    }

    // 4. Send Notification to Rider's devices
    const rider = await Rider.findById(riderId);
    if (rider && rider.userId) {
      await sendNotification({
        recipientId: rider.userId,
        recipientType: "RIDER",
        title: "New order assigned",
        body: "You have been assigned a new order. Tap to view.",
        data: { orderId: String(orderId) },
        eventType: "NEW_DELIVERY_REQUEST",
        deepLink: "/rider/dashboard",
        orderId: String(orderId),
        type: "ALERT",
        category: "orderUpdates",
        io: req.app.get("io"),
      });
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(403).json({ error: e.message });
  }
}
