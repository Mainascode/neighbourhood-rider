
import Order from "../../models/Order.js";
import Rider from "../../models/Rider.js";

/**
 * POST /api/riders/accept-order
 * Body: { orderId }
 */
export async function acceptOrder(req, res) {
    try {
        const { orderId } = req.body;
        const riderUser = req.user; // from requireAuth

        // Find the rider profile
        const rider = await Rider.findOne({ userId: riderUser._id });
        if (!rider) return res.status(404).json({ error: "Rider not found" });

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ error: "Order not found" });

        // Check if this rider is actually assigned
        if (order.riderId && order.riderId.toString() !== rider._id.toString()) {
            return res.status(403).json({ error: "You are not assigned to this order" });
        }

        // Using user's logic: "Validate rider is ONLINE_AVAILABLE... Set rider status = ONLINE_BUSY"
        // But since we auto-assigned, they might already be BUSY. We'll ensure they are at least "assigned" to this order.

        // Confirm assignment -> Update status to 'picking_up' (or just keep 'assigned' and confirm?)
        // The prompt says "Confirm order assignment". 
        // We'll update order status to 'picking_up' to signify acceptance and progress.

        order.status = "picking_up";
        await order.save();

        // Ensure rider is BUSY
        rider.status = "ONLINE_BUSY";
        await rider.save();

        res.json({ success: true, message: "Order accepted", order });

    } catch (err) {
        console.error("Accept Order Error:", err);
        res.status(500).json({ error: "Failed to accept order" });
    }
}

/**
 * POST /api/riders/reject-order
 * Body: { orderId }
 */
export async function rejectOrder(req, res) {
    try {
        const { orderId } = req.body;
        const riderUser = req.user;

        const rider = await Rider.findOne({ userId: riderUser._id });
        if (!rider) return res.status(404).json({ error: "Rider not found" });

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ error: "Order not found" });

        // Check if this rider is actually assigned
        if (order.riderId && order.riderId.toString() !== rider._id.toString()) {
            return res.status(403).json({ error: "You are not assigned to this order" });
        }

        // 1. Unassign Rider
        order.riderId = null;
        order.status = "pending"; // Reset to pending to allow reassignment
        await order.save();

        // 2. Set Rider to ONLINE_AVAILABLE
        rider.status = "ONLINE_AVAILABLE";
        await rider.save();

        // 3. Trigger Reassignment
        // Use matchOrder with exclusion list
        const { matchOrder } = await import("../../services/matching.js");
        const io = req.app.get("io");

        const pickupLocation = {
            lat: order.pickup.location.coordinates[1],
            lng: order.pickup.location.coordinates[0]
        };

        // Exclude the current rider from the next match attempt
        matchOrder(orderId, pickupLocation, 1, [rider._id], io).then(result => {
            console.log(`Reassignment result for order ${orderId}:`, result.success ? "Assigned" : "No rider found");
        }).catch(err => console.error("Reassignment error:", err));


        res.json({ success: true, message: "Order rejected. Reassigning..." });

    } catch (err) {
        console.error("Reject Order Error:", err);
        res.status(500).json({ error: "Failed to reject order" });
    }
}
