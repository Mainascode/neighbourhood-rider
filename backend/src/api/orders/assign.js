import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import Rider from "../../models/Rider.js";
import { sendNotification } from "../../lib/notificationService.js";
import { updateOrderStatus, ORDER_STATUS } from "../../lib/orderStatus.js";
import { isRuakaLaunchModeEnabled } from "../../lib/launchMode.js";

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
      currentOrders: 1,
    });

    const rider = await Rider.findById(riderId);
    const { getRiderAcceptTimeoutSeconds } = await import("../../lib/riderConfig.js");
    const acceptSeconds = await getRiderAcceptTimeoutSeconds(orderId);
    const responseTimeoutMs = Math.max(30, Number(acceptSeconds || 30)) * 1000;

    // 3. Notify Rider via Socket
    const io = req.app.get("io");
    if (io) {
      const riderPayload = {
        _id: orderId,
        orderId,
        status: ORDER_STATUS.RIDER_ASSIGNED,
        title: "New Delivery Request",
        body: `Pickup at ${order.pickup?.address || "pickup location"} • Earn KES ${Number(order.deliveryFee || 0)}`,
        pickupAddress: order.pickup?.address || "Pickup location",
        estimatedEarnings: Number(order.deliveryFee || 0),
        acceptBy: Date.now() + responseTimeoutMs
      };
      io.emit(`rider:order:${riderId}`, riderPayload);
      if (rider?.userId) {
        io.to(`rider:${rider.userId}`).emit("rider:new_order", riderPayload);
        io.to(`rider:${rider.userId}`).emit("delivery:request", riderPayload);
      }
    }

    // 4. Send Notification to Rider's devices
    if (rider && rider.userId) {
      await sendNotification({
        recipientId: rider.userId,
        recipientType: "RIDER",
        title: "New Delivery Request",
        body: `Pickup at ${order.pickup?.address || "pickup location"} • Earn KES ${Number(order.deliveryFee || 0)}`,
        data: { orderId: String(orderId) },
        eventType: "NEW_DELIVERY_REQUEST",
        deepLink: "/rider/dashboard",
        orderId: String(orderId),
        type: "ALERT",
        category: "orderUpdates",
        io: req.app.get("io"),
      });
    }

    // Auto-reassign after timeout if rider does not respond
    setTimeout(async () => {
      try {
        const launchMode = isRuakaLaunchModeEnabled();
        const currentOrder = await Order.findById(orderId);
        if (!currentOrder) return;
        const stillPending = currentOrder.status === ORDER_STATUS.RIDER_ASSIGNED
          && currentOrder.riderId?.toString() === riderId.toString();
        if (!stillPending) return;

        await updateOrderStatus({
          orderId: currentOrder._id,
          fromStatusRaw: currentOrder.status,
          toStatus: launchMode ? ORDER_STATUS.PENDING_RIDER : ORDER_STATUS.READY_FOR_PICKUP,
          actor: { role: "system", name: "assign_timeout" },
          source: "orders.assign.timeout",
          reason: "RIDER_TIMEOUT",
          io: req.app.get("io"),
          set: { riderId: null },
        });

        await Rider.findByIdAndUpdate(riderId, { status: "ONLINE_AVAILABLE", isAvailable: true, currentOrders: 0 });

        if (!launchMode) {
          const { matchOrder } = await import("../../services/matching.js");
          const pickup = {
            lat: currentOrder.pickup?.location?.coordinates?.[1],
            lng: currentOrder.pickup?.location?.coordinates?.[0],
          };
          if (Number.isFinite(pickup.lat) && Number.isFinite(pickup.lng)) {
            matchOrder(String(currentOrder._id), pickup, 1, [String(riderId)], req.app.get("io"), Date.now());
          }
        }
      } catch (err) {
        console.error("Assign timeout reassign error:", err);
      }
    }, responseTimeoutMs);

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(403).json({ error: e.message });
  }
}
