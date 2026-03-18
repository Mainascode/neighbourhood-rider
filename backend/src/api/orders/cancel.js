import Order from "../../models/Order.js";
import { updateOrderStatus, ORDER_STATUS } from "../../lib/orderStatus.js";
import { refundOrder } from "../../lib/wallet.js";

/**
 * POST /api/orders/:id/cancel
 * User cancels their own order (if allowed).
 */
export default async function cancelOrder(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { reason } = req.body || {};

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.userId?.toString() !== user._id?.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if ([ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED].includes(order.status)) {
      return res.status(400).json({ message: "Order cannot be cancelled at this stage" });
    }

    await updateOrderStatus({
      orderId: order._id,
      fromStatusRaw: order.status,
      toStatus: ORDER_STATUS.CANCELLED,
      actor: { id: user._id, role: user.role, name: user.name },
      source: "orders.cancel",
      reason: reason || "USER_CANCELLED",
      io: req.app.get("io"),
    });

    if (order.paid || order.isDeliveryFeePaid) {
      await refundOrder(order, reason || "USER_CANCELLED");
      await updateOrderStatus({
        orderId: order._id,
        fromStatusRaw: ORDER_STATUS.CANCELLED,
        toStatus: ORDER_STATUS.REFUNDED,
        actor: { id: user._id, role: user.role, name: user.name },
        source: "orders.cancel",
        reason: reason || "USER_CANCELLED",
        io: req.app.get("io"),
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Order cancel error:", err);
    res.status(500).json({ message: "Failed to cancel order" });
  }
}
