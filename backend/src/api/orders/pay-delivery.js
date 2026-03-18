import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    await connectDB();
    const { orderId, paymentMethod } = req.body;

    try {
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        // In a real app, verify payment with paymentMethod provider here.
        // For this flow, we assume successful payment of 50 KES.

        // Simulate processing
        const isSuccess = true;

        if (isSuccess) {
            order.isDeliveryFeePaid = true;
            // Note: we do NOT mark 'paid' as true, because 'paid' usually implies the whole order is settled.
            // We might want to keep 'paid' false until user pays rider, or use it for the fee.
            // Based on schema, 'paid' is for "Overall Payment". 
            // Let's keep 'paid' false, and rely on 'isDeliveryFeePaid'. 
            // Ideally, the rider marks the order as 'completed' and that implies goods paid.

            await order.save();

            const io = req.app.get("io");
            if (io) {
                io.to(`order:${orderId}`).emit("order:update", order);
            }

            res.status(200).json({ success: true, message: "Delivery fee paid", order });
        } else {
            res.status(400).json({ message: "Payment failed" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
}
