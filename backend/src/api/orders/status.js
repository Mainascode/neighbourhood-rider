
import Order from "../../models/Order.js";
import { normalizeOrderStatus } from "../../lib/orderStatus.js";

/**
 * GET /api/orders/:id/status
 */
export async function getOrderStatus(req, res) {
    try {
        const { id } = req.params;
        const order = await Order.findById(id)
            .select("status paid amount deliveryFee isDeliveryFeePaid goodsTotal finalTotal riderResponseStatus updatedAt");

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        const normalizedStatus = normalizeOrderStatus(order.status);
        const searching = ["CREATED", "PAYMENT_PENDING", "PAYMENT_CONFIRMED", "PAID"].includes(normalizedStatus);

        const response = {
            status: normalizedStatus,
            searching: searching,
            riderAssigned: ["RIDER_ASSIGNED", "SHOPPING", "DELIVERING", "DELIVERED", "PROCESSING", "ON_THE_WAY"].includes(normalizedStatus),
            paid: Boolean(order.paid),
            totalPaid: Number(order.finalTotal || order.amount || 0),
            deliveryFee: Number(order.deliveryFee || 0),
            itemsTotal: Number(order.goodsTotal || 0),
            finalTotal: Number(order.finalTotal || order.amount || 0),
            awaitingConfirmation: normalizedStatus === "AWAITING_CONFIRMATION",
            riderResponseStatus: order.riderResponseStatus || "PENDING",
            riderAccepted: order.riderResponseStatus === "ACCEPTED",
            riderRejected: order.riderResponseStatus === "REJECTED",
            updatedAt: order.updatedAt,
        };

        res.json(response);

    } catch (err) {
        console.error("Order Status Error:", err);
        res.status(500).json({ error: "Failed to get order status" });
    }
}
