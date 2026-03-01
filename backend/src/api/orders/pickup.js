import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import Vendor from "../../models/Vendor.js";
import { sendNotification } from "../../lib/notificationService.js";
import { PENALTY_CONFIG, recordLatePickup } from "../../lib/penalties.js";
import { updateOrderStatus, ORDER_STATUS, normalizeOrderStatus } from "../../lib/orderStatus.js";

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    await connectDB();
    const { orderId } = req.body;

    try {
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        const Rider = (await import("../../models/Rider.js")).default;
        const riderProfile = await Rider.findOne({ userId: req.user._id });
        if (!riderProfile || order.riderId?.toString() !== riderProfile._id.toString()) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const normalizedStatus = normalizeOrderStatus(order.status);
        if (![ORDER_STATUS.RIDER_ASSIGNED, ORDER_STATUS.ON_THE_WAY].includes(normalizedStatus))
            return res.status(400).json({ message: "Order is not ready for pickup" });

        if (normalizedStatus === ORDER_STATUS.RIDER_ASSIGNED) {
            await updateOrderStatus({
                orderId: order._id,
                fromStatusRaw: order.status,
                toStatus: ORDER_STATUS.ON_THE_WAY,
                actor: { id: req.user?._id, role: req.user?.role, name: req.user?.name },
                source: "orders.pickup",
                io: req.app.get("io"),
            });
        }

        order.goodsPaid = true; // Confirmed by Rider that user paid vendor
        order.pickedUpAt = new Date();
        await order.save();

        if (order.riderId && order.riderAssignedAt) {
            const pickupDelayMs = order.pickedUpAt.getTime() - order.riderAssignedAt.getTime();
            const pickupDelayMinutes = pickupDelayMs / (1000 * 60);
            if (pickupDelayMinutes > PENALTY_CONFIG.latePickupMinutes) {
                await recordLatePickup(order.riderId);
            }
        }

        const io = req.app.get("io");
        if (io) {
            io.to(`order:${orderId}`).emit("order:update", order);
        }

        if (order.vendorId) {
            const vendor = await Vendor.findById(order.vendorId).select("userId");
            if (vendor?.userId) {
                await sendNotification({
                    recipientId: vendor.userId,
                    recipientType: "VENDOR",
                    title: "Rider arrived for pickup",
                    body: "The rider has arrived and picked up the order.",
                    data: { orderId: String(orderId) },
                    eventType: "RIDER_ARRIVED",
                    deepLink: "/vendor/dashboard",
                    orderId: String(orderId),
                    type: "ALERT",
                    category: "orderUpdates",
                    io: req.app.get("io"),
                });
            }
        }

        if (order.userId) {
            await sendNotification({
                recipientId: order.userId,
                recipientType: "USER",
                title: "Rider arrived",
                body: "Your rider picked up the order and is heading to you.",
                data: { orderId: String(orderId), status: ORDER_STATUS.ON_THE_WAY },
                eventType: "RIDER_ARRIVED",
                deepLink: "/orders",
                orderId: String(orderId),
                type: "ALERT",
                category: "orderUpdates",
                io: req.app.get("io"),
            });
        }

        res.status(200).json({ success: true, message: "Pickup confirmed", order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
}
