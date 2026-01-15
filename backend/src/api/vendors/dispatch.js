
import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import Vendor from "../../models/Vendor.js";
import { assignBestRider, findNearestRiders } from "../../lib/matchRider.js";
import requireAuth from "../../middleware/auth.js";
import { sendPushNotification } from "../../lib/push.js";

/**
 * POST /api/vendors/orders/dispatch
 * Vendor requests a rider for a specific order
 */
export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const user = requireAuth(req);
    await connectDB();

    const { orderId } = req.body;

    // Verify Vendor Ownership
    const vendor = await Vendor.findOne({ userId: user.id });
    if (!vendor) return res.status(403).json({ message: "Not a vendor" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.vendorId.toString() !== vendor._id.toString()) {
        return res.status(403).json({ message: "Unauthorized order access" });
    }

    // Find and Assign Rider
    // Reuse existing logic: Find Best Rider and Assign
    const riders = await findNearestRiders(vendor.location.coordinates[0], vendor.location.coordinates[1]);
    const assignedRider = await assignBestRider(order);

    if (assignedRider) {
        order.status = "assigned";
        await order.save();

        const io = req.app.get("io");
        if (io) {
            io.to(`order:${order._id}`).emit("order:update", order);
            io.emit(`rider:order:${assignedRider.userId}`, order);
        }

        await sendPushNotification(
            assignedRider.userId,
            "New Delivery Request! 📦",
            `${vendor.storeName} needs a delivery. Tap to accept.`,
            "/rider/orders"
        );

        return res.json({ success: true, message: "Rider requested and assigned", assignedRider: assignedRider.name });
    } else {
        // If no rider found locally, maybe broadcast?
        // For now tell vendor "No riders nearby"
        return res.status(404).json({ success: false, message: "No nearby riders found" });
    }
}
