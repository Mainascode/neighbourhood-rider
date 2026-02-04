import Order from "../../models/Order.js";
import { sendPushNotification } from "../../lib/push.js";

import { releasePendingFunds } from "../../lib/wallet.js";

export default async function deliverOrder(req, res) {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "delivering")
        return res.status(400).json({ message: "Order must be in delivering state" });

    order.status = "delivered";
    await order.save();

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

    // Notify Customer via Push
    await sendPushNotification(
        order.userId,
        "Order Delivered! 📍",
        "Your rider has arrived. Please confirm and pay.",
        "/orders"
    );

    res.json({ success: true, message: "Order marked as delivered" });
}
