import connectDB from "../../../../../lib/db.js";
import Order from "../../../../../models/Order.js";
import Payment from "../../../../../models/Payment.js";
import User from "../../../../../models/User.js";
import { ok } from "../../../../../lib/response.js";

export async function POST(request) {
  const body = await request.json();
  const stk = body?.Body?.stkCallback || {};
  const checkoutRequestId = stk.CheckoutRequestID;

  await connectDB();
  const payment = await Payment.findOne({ checkoutRequestId });

  if (!payment) {
    return ok({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  payment.payload = body;

  if (Number(stk.ResultCode) === 0) {
    const metadata = stk.CallbackMetadata?.Item || [];
    const receipt = metadata.find((entry) => entry.Name === "MpesaReceiptNumber")?.Value || "";
    payment.status = "paid";
    payment.receiptNumber = receipt;
    await payment.save();

    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = "paid";
      order.paidAt = new Date();
      order.paymentData = body;
      await order.save();

      if (order.freeDeliveryApplied && !order.referralCreditConsumed) {
        const user = await User.findById(order.userId);
        if (user && user.freeDeliveryCredits > 0) {
          user.freeDeliveryCredits -= 1;
          await user.save();
          order.referralCreditConsumed = true;
          await order.save();
        }
      }
    }
  } else {
    payment.status = "failed";
    await payment.save();
    await Order.findByIdAndUpdate(payment.orderId, {
      paymentStatus: "failed",
      paymentData: body,
    });
  }

  return ok({ ResultCode: 0, ResultDesc: "Accepted" });
}
