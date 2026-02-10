import Order from "../../models/Order.js";
import { PENALTY_CONFIG, recordLateDelivery } from "../../lib/penalties.js";
import { updateOrderStatus, ORDER_STATUS, normalizeOrderStatus } from "../../lib/orderStatus.js";

import { releasePendingFunds } from "../../lib/wallet.js";

export default async function deliverOrder(req, res) {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const normalizedStatus = normalizeOrderStatus(order.status);
    if (normalizedStatus !== ORDER_STATUS.ON_THE_WAY)
        return res.status(400).json({ message: "Order must be on the way" });

    await updateOrderStatus({
        orderId: order._id,
        fromStatusRaw: order.status,
        toStatus: ORDER_STATUS.DELIVERED,
        actor: { id: req.user?._id, role: req.user?.role, name: req.user?.name },
        source: "orders.deliver",
        io: req.app.get("io"),
    });
    order.deliveredAt = new Date();
    await order.save();

    if (order.riderId) {
        const deliveryStart = order.pickedUpAt || order.riderAssignedAt;
        if (deliveryStart) {
            const deliveryDelayMs = order.deliveredAt.getTime() - deliveryStart.getTime();
            const deliveryDelayMinutes = deliveryDelayMs / (1000 * 60);
            if (deliveryDelayMinutes > PENALTY_CONFIG.lateDeliveryMinutes) {
                await recordLateDelivery(order.riderId);
            }
        }
    }

    // Release Pending Funds (If order was prepaid)
    if (order.paid) {
        console.log(`[Order] Releasing funds for prepaid order ${order._id}`);
        await releasePendingFunds(order._id);
    }



    // ...
    // Notify User via Socket
    const io = req.app.get("io");
    if (io) {
        io.to(`order:${orderId}`).emit("order:update", order);
        io.to(`order:${orderId}`).emit("order:delivered", { message: "Order Delivered", orderId });
    }

    res.json({ success: true, message: "Order marked as delivered" });
}
