import express from "express";
import Order from "../../models/Order.js";
import { updateOrderStatus, ORDER_STATUS } from "../../lib/orderStatus.js";
import Payment from "../../models/Payment.js";

const router = express.Router();

/**
 * M-Pesa callback (public)
 */
router.post("/", async (req, res) => {
  try {
    const callback = req.body?.Body?.stkCallback;
    if (!callback) return res.json({ ResultCode: 0 });

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = callback;

    const payment = await Payment.findOne({ checkoutId: CheckoutRequestID });
    if (!payment) return res.json({ ResultCode: 0 });

    if (ResultCode === 0) {
      const amount = CallbackMetadata.Item.find(i => i.Name === "Amount")?.Value;

      payment.status = "PAID";
      payment.amount = amount;
      await payment.save();

      const order = await Order.findById(payment.order);
      if (order) {
        try {
          await updateOrderStatus({
            orderId: order._id,
            fromStatusRaw: order.status,
            toStatus: ORDER_STATUS.PAYMENT_CONFIRMED,
            actor: { role: "system", name: "mpesa_callback" },
            source: "payments.callback",
            set: { paymentStatus: "PAID" },
          });
        } catch (err) {
          await Order.findByIdAndUpdate(order._id, { paymentStatus: "PAID" });
        }
      }
    } else {
      payment.status = "FAILED";
      await payment.save();
    }

    res.json({ ResultCode: 0 });
  } catch (err) {
    console.error("M-Pesa callback error", err);
    res.json({ ResultCode: 0 });
  }
});

export default router;
