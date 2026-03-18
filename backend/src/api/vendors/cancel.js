import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import Vendor from "../../models/Vendor.js";
import { refundOrder } from "../../lib/wallet.js";
import { updateOrderStatus, ORDER_STATUS } from "../../lib/orderStatus.js";

/**
 * POST /api/vendors/orders/:id/cancel
 * Vendor cancels an order.
 */
export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const user = req.user; // from requireAuth
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    await connectDB();
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
        return res.status(400).json({ message: "Cancellation reason is required" });
    }

    const validReasons = ["OUT_OF_STOCK", "TOO_BUSY", "STORE_CLOSED", "SYSTEM_ERROR"];
    if (!validReasons.includes(reason)) {
        return res.status(400).json({ message: "Invalid cancellation reason" });
    }

    try {
        // Verify Vendor
        const vendor = await Vendor.findOne({ userId: user.id });
        if (!vendor) return res.status(403).json({ message: "Not a vendor" });

        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (order.vendorId.toString() !== vendor._id.toString()) {
            return res.status(403).json({ message: "Unauthorized order access" });
        }

        // Rule: Only allow cancellation if pending_vendor or preparing
        const allowedStatuses = [
            ORDER_STATUS.CREATED,
            ORDER_STATUS.PAYMENT_PENDING,
            ORDER_STATUS.PAYMENT_CONFIRMED,
            ORDER_STATUS.VENDOR_ACCEPTED,
            ORDER_STATUS.PREPARING,
        ];
        // Note: payment_pending might not have vendor attached properly or vendor shouldn't see it yet, 
        // but if they do (e.g. system error), they can cancel.

        if (!allowedStatuses.includes(order.status)) {
            return res.status(400).json({
                message: `Cannot cancel order in status: ${order.status}. Contact Admin.`
            });
        }

        // Execute Cancellation
        order.vendorCancelReason = reason;
        await updateOrderStatus({
            orderId: order._id,
            fromStatusRaw: order.status,
            toStatus: ORDER_STATUS.CANCELLED,
            actor: { id: user.id, role: user.role, name: user.name },
            source: "vendors.cancel",
            reason,
            io: req.app.get("io"),
        });

        // Process Refund
        await refundOrder(order, reason);
        await updateOrderStatus({
            orderId: order._id,
            fromStatusRaw: ORDER_STATUS.CANCELLED,
            toStatus: ORDER_STATUS.REFUNDED,
            actor: { id: user.id, role: user.role, name: user.name },
            source: "vendors.cancel",
            reason,
            io: req.app.get("io"),
        });

        // Notify User
        const io = req.app.get("io");
        if (io) {
            io.to(`order:${order._id}`).emit("order:update", order);
        }

        res.json({ success: true, message: "Order cancelled and refunded", order });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
}
