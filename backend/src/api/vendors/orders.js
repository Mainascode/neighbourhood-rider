
import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import Vendor from "../../models/Vendor.js";
import { updateOrderStatus, ORDER_STATUS, normalizeOrderStatus } from "../../lib/orderStatus.js";

/**
 * PATCH /api/orders/:id/confirm-goods
 * Vendor confirms they have received payment for the goods
 */
export async function confirmGoodsPayment(req, res) {
    if (req.method !== "PATCH") return res.status(405).end();

    // User is attached by requireAuth middleware in server.js
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    await connectDB();
    const { id } = req.params;

    /* Time Validation */
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour < 6 || currentHour >= 21) {
        return res.status(400).json({
            message: "System closed. Operating hours: 06:00 - 21:00.",
            systemClosed: true
        });
    }

    try {
        // Verify Vendor Ownership
        const vendor = await Vendor.findOne({ userId: user.id });
        if (!vendor) return res.status(403).json({ message: "Not a vendor" });

        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (order.vendorId.toString() !== vendor._id.toString()) {
            return res.status(403).json({ message: "Unauthorized order access" });
        }

        const currentStatus = normalizeOrderStatus(order.status);
        if (currentStatus === ORDER_STATUS.PAYMENT_CONFIRMED) {
            const io = req.app.get("io");
            const vendorActor = { id: user.id, role: user.role, name: user.name };
            const first = await updateOrderStatus({
                orderId: order._id,
                fromStatusRaw: order.status,
                toStatus: ORDER_STATUS.VENDOR_ACCEPTED,
                actor: vendorActor,
                source: "vendors.confirm-goods",
                io,
                set: { goodsPaid: true },
            });
            const second = await updateOrderStatus({
                orderId: order._id,
                fromStatusRaw: first.status,
                toStatus: ORDER_STATUS.PREPARING,
                actor: vendorActor,
                source: "vendors.confirm-goods",
                io,
            });
            await updateOrderStatus({
                orderId: order._id,
                fromStatusRaw: second.status,
                toStatus: ORDER_STATUS.READY_FOR_PICKUP,
                actor: vendorActor,
                source: "vendors.confirm-goods",
                io,
            });
        } else {
            order.goodsPaid = true;
            await order.save();
        }

        // Notify User via Socket?
        const io = req.app.get("io");
        if (io) {
            io.to(`order:${order._id}`).emit("order:update", order);
        }

        return res.json({ success: true, message: "Goods payment confirmed", order });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}
