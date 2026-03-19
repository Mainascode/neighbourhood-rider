
import Order from "../../models/Order.js";
import { initiateSTKPush } from "../payments/mpesaController.js";

// This endpoint triggers the full order payment using the existing STK push flow.
export default async function payDeliveryFee(req, res) {
    try {
        const { orderId, paymentMethod, phoneNumber } = req.body;

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (order.paid) {
            return res.status(400).json({ message: "Order already paid" });
        }

        if (paymentMethod === 'mpesa') {
            req.body.amount = order.amount;
            req.body.phoneNumber = phoneNumber || req.user.phone; // Fallback to user profile phone
            await initiateSTKPush(req, res);

        } else if (paymentMethod === 'google_pay') {
            order.paid = true;
            order.goodsPaid = true;
            order.isDeliveryFeePaid = true;
            order.paymentMethod = 'google_pay';
            await order.save();

            res.json({ success: true, order });
        } else {
            res.status(400).json({ message: "Invalid payment method" });
        }

    } catch (error) {
        console.error("Pay Delivery Error:", error);
        res.status(500).json({ message: "Payment failed" });
    }
}
