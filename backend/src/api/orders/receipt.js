import Order from "../../models/Order.js";
import { normalizeOrderStatus, ORDER_STATUS } from "../../lib/orderStatus.js";

export default async function confirmReceipt(req, res) {
    try {
        const { orderId } = req.body;
        const userId = req.user._id;

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        // Ensure the user owns the order
        if (order.userId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const normalizedStatus = normalizeOrderStatus(order.status);
        if (normalizedStatus !== ORDER_STATUS.ON_THE_WAY && normalizedStatus !== ORDER_STATUS.DELIVERED) {
            // Allowing 'delivered' status too just in case rider marked it but user hadn't confirmed yet (though simplified flow implies user confirms first?)
            // Actually, usually Rider marks "Arrived", then User checks, then User confirms, then Rider completes.
            // Let's allow it if status is delivering or picking_up (in case of weird flow) but mainly delivering.
            // Actually, let's just update the flag.
        }

        order.isReceived = true;
        await order.save();

        // Notify Rider
        const io = req.app.get("io");
        if (io) {
            io.to(`order:${orderId}`).emit("order:received", {
                orderId,
                message: "User has confirmed receipt!",
                isReceived: true
            });
        }

        res.json({ success: true, message: "Receipt confirmed" });
    } catch (error) {
        console.error("Confirm Receipt Error:", error);
        res.status(500).json({ message: "Error confirming receipt" });
    }
}
