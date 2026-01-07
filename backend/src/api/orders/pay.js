import Order from "../../models/Order.js";

export default async function payOrder(req, res) {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "delivered")
        return res.status(400).json({ message: "Order must be delivered before payment" });

    // Mock Payment Processing
    order.status = "completed";
    order.paid = true;
    await order.save();

    // Notify Everyone
    const io = req.app.get("io");
    if (io) {
        io.to(`order:${orderId}`).emit("order:update", order);
        io.to(`order:${orderId}`).emit("order:paid", { message: "Payment Successful", orderId });
    }

    res.json({ success: true, message: "Payment successful, order completed" });
}
