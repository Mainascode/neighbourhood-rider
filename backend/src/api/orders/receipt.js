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
        if (normalizedStatus !== ORDER_STATUS.DELIVERED) {
            return res.status(400).json({ message: "Receipt is available after delivery" });
        }

        order.isReceived = true;
        await order.save();

        res.json({ success: true, message: "Receipt confirmed" });
    } catch (error) {
        console.error("Confirm Receipt Error:", error);
        res.status(500).json({ message: "Error confirming receipt" });
    }
}
