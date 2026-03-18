import connectDB from "../../../../lib/db.js";
import Order from "../../../../models/Order.js";
import { requireApiUser } from "../../../../lib/api-auth.js";
import { fail, ok } from "../../../../lib/response.js";

export async function GET(_request, { params }) {
  const user = await requireApiUser();
  if (!user) {
    return fail("Unauthorized.", 401);
  }

  await connectDB();
  const order = await Order.findById(params.id).lean();

  if (!order || (order.userId.toString() !== user.id && user.role !== "admin")) {
    return fail("Order not found.", 404);
  }

  return ok({
    order: {
      id: order._id.toString(),
      status: order.status,
      paymentStatus: order.paymentStatus,
      itemsTotal: order.itemsTotal,
      deliveryFee: order.deliveryFee,
      totalPrice: order.totalPrice,
      items: order.items,
    },
  });
}
