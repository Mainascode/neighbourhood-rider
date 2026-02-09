
import Order from "../../models/Order.js";

/**
 * GET /api/orders/:id/status
 */
export async function getOrderStatus(req, res) {
    try {
        const { id } = req.params;
        const order = await Order.findById(id)
            .populate("riderId", "name phone riderPicture location vehicleType") // Populate rider details
            .select("status riderId");

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        const isAssigned = !!order.riderId;

        // Searching if pending and NOT assigned
        // Statuses like 'assigned', 'picking_up' etc mean searching is done.
        const searching = !isAssigned && ["pending", "pending_vendor"].includes(order.status);

        const response = {
            status: order.status,
            searching: searching,
            riderAssigned: isAssigned,
        };

        if (isAssigned && order.riderId) {
            response.rider = {
                name: order.riderId.name,
                phone: order.riderId.phone,
                vehicleType: order.riderId.vehicleType,
                picture: order.riderId.riderPicture,
                location: order.riderId.location // Real-time location from Rider model
            };
        }

        res.json(response);

    } catch (err) {
        console.error("Order Status Error:", err);
        res.status(500).json({ error: "Failed to get order status" });
    }
}
