import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import { sendPushNotification } from "../../lib/push.js";

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    await connectDB();
    const { orderId } = req.body;

    try {
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (order.status !== "picking_up")
            return res.status(400).json({ message: "Order is not in pickup phase" });

        // Transition to Delivering
        order.status = "delivering";
        order.goodsPaid = true; // Confirmed by Rider that user paid vendor
        await order.save();

        const io = req.app.get("io");
        if (io) {
            io.to(`order:${orderId}`).emit("order:update", order);
        }

        await sendPushNotification(
            order.userId,
            "Order Picked Up! 🛍️",
            "Rider has collected your items and is on the way!",
            `/order/${orderId}`
        );

        res.status(200).json({ success: true, message: "Pickup confirmed", order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
}
