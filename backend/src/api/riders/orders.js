
import Order from "../../models/Order.js";
import Rider from "../../models/Rider.js";
import { recordRejection } from "../../lib/penalties.js";
import { updateOrderStatus, ORDER_STATUS, normalizeOrderStatus } from "../../lib/orderStatus.js";

/**
 * POST /api/riders/accept-order
 * Body: { orderId }
 */
export async function acceptOrder(req, res) {
    try {
        const { orderId } = req.body;
        const riderUser = req.user; // from requireAuth

        // Find the rider profile
        const rider = await Rider.findOne({ userId: riderUser._id });
        if (!rider) return res.status(404).json({ error: "Rider not found" });

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ error: "Order not found" });

        // Check if this rider is actually assigned
        if (order.riderId && order.riderId.toString() !== rider._id.toString()) {
            return res.status(403).json({ error: "You are not assigned to this order" });
        }

        // Using user's logic: "Validate rider is ONLINE_AVAILABLE... Set rider status = ONLINE_BUSY"
        // But since we auto-assigned, they might already be BUSY. We'll ensure they are at least "assigned" to this order.

        const normalizedStatus = normalizeOrderStatus(order.status);
        if (normalizedStatus !== ORDER_STATUS.RIDER_ASSIGNED) {
            return res.status(400).json({ error: `Order is already ${order.status}` });
        }

        await updateOrderStatus({
            orderId: order._id,
            fromStatusRaw: order.status,
            toStatus: ORDER_STATUS.ON_THE_WAY,
            actor: { id: riderUser._id, role: riderUser.role, name: riderUser.name },
            source: "riders.accept-order",
            io: req.app.get("io"),
        });

        // Ensure rider is BUSY
        rider.status = "ONLINE_BUSY";
        rider.isAvailable = false;
        await rider.save();

        res.json({ success: true, message: "Order accepted", order });

    } catch (err) {
        console.error("Accept Order Error:", err);
        res.status(500).json({ error: "Failed to accept order" });
    }
}

/**
 * POST /api/riders/reject-order
 * Body: { orderId }
 */
export async function rejectOrder(req, res) {
    try {
        const { orderId } = req.body;
        const riderUser = req.user;

        const rider = await Rider.findOne({ userId: riderUser._id });
        if (!rider) return res.status(404).json({ error: "Rider not found" });

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ error: "Order not found" });

        // Check if this rider is actually assigned
        if (order.riderId && order.riderId.toString() !== rider._id.toString()) {
            return res.status(403).json({ error: "You are not assigned to this order" });
        }

        // 1. Unassign Rider
        await updateOrderStatus({
            orderId: order._id,
            fromStatusRaw: order.status,
            toStatus: ORDER_STATUS.READY_FOR_PICKUP,
            actor: { id: riderUser._id, role: riderUser.role, name: riderUser.name },
            source: "riders.reject-order",
            reason: "RIDER_REJECTED",
            io: req.app.get("io"),
            set: { riderId: null },
        });

        // 2. Set Rider to ONLINE_AVAILABLE
        rider.status = "ONLINE_AVAILABLE";
        rider.isAvailable = true;
        await rider.save();

        await recordRejection(rider._id);

        const { matchOrder } = await import("../../services/matching.js");
        const io = req.app.get("io");
        const pickupLocation = {
            lat: order.pickup.location.coordinates[1],
            lng: order.pickup.location.coordinates[0]
        };
        matchOrder(orderId, pickupLocation, 1, [rider._id], io, Date.now());

        res.json({ success: true, message: "Order rejected. Reassigning..." });

    } catch (err) {
        console.error("Reject Order Error:", err);
        res.status(500).json({ error: "Failed to reject order" });
    }
}
