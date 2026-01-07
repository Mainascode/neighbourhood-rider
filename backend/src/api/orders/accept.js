
import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import Rider from "../../models/Rider.js";

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    try {
        await connectDB();
        const { orderId } = req.body;
        const user = req.user;

        if (user.role !== "rider") {
            return res.status(403).json({ error: "Only riders can accept orders" });
        }

        // 1. Verify Rider Profile
        const riderProfile = await Rider.findOne({ userId: user._id });
        if (!riderProfile) {
            return res.status(404).json({ error: "Rider profile not found" });
        }

        // 2. Find Order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // 3. Verify Assignment
        // Ensure the order is actually assigned to THIS rider
        if (order.riderId.toString() !== riderProfile._id.toString()) {
            return res.status(403).json({ error: "This order is not assigned to you" });
        }

        if (order.status !== "assigned") {
            return res.status(400).json({ error: `Order is already ${order.status}` });
        }

        // 4. Update Status
        order.status = "delivering";
        await order.save();

        // 5. Notify via Socket (Frontend listens for this)
        const io = req.app.get("io");
        if (io) {
            io.to(`order:${order._id}`).emit("order:update", order);
            io.emit("admin:order:update", order); // Notify admin dashboard
        }

        res.json({ success: true, order });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
}
