import connectDB from "../../../../../lib/db.js";
import Order from "../../../../../models/Order.js";
import User from "../../../../../models/User.js";
import { requireApiAdmin } from "../../../../../lib/api-auth.js";
import { applyReferralRewardIfEligible } from "../../../../../lib/referrals.js";
import { fail, ok } from "../../../../../lib/response.js";
import { ORDER_STATUSES } from "../../../../../lib/constants.js";

export async function PATCH(request, { params }) {
  const admin = await requireApiAdmin();
  if (!admin) {
    return fail("Unauthorized.", 401);
  }

  const body = await request.json();
  if (!ORDER_STATUSES.includes(body.status)) {
    return fail("Invalid order status.");
  }

  await connectDB();
  const order = await Order.findById(params.id);

  if (!order) {
    return fail("Order not found.", 404);
  }

  order.status = body.status;
  if (body.status === "delivered") {
    order.deliveredAt = new Date();
    const user = await User.findById(order.userId);
    if (user) {
      user.hasCompletedOrder = true;
      await user.save();
      await applyReferralRewardIfEligible(user.referredBy);
    }
  } else {
    order.deliveredAt = undefined;
  }

  await order.save();
  return ok({ message: "Order status updated." });
}
