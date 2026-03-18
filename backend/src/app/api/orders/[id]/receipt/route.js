import connectDB from "../../../../../lib/db.js";
import Order from "../../../../../models/Order.js";
import { requireApiUser } from "../../../../../lib/api-auth.js";
import { fail, ok } from "../../../../../lib/response.js";

export async function GET(_request, { params }) {
  const user = await requireApiUser();
  if (!user) {
    return fail("Unauthorized.", 401);
  }

  await connectDB();
  const order = await Order.findById(params.id).lean();

  if (!order || (order.userId.toString() !== user.id && user.role !== "admin")) {
    return fail("Receipt not found.", 404);
  }

  const copy = user.role === "admin" ? "Admin copy" : "Customer copy";

  return ok({
    receipt: {
      copy,
      orderId: order._id.toString(),
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      area: order.area,
      address: order.address,
      items: order.items,
      itemsTotal: order.itemsTotal,
      deliveryFee: order.deliveryFee,
      totalPrice: order.totalPrice,
      paymentStatus: order.paymentStatus,
      paidAt: order.paidAt
        ? new Intl.DateTimeFormat("en-KE", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Africa/Nairobi",
          }).format(order.paidAt)
        : null,
      createdAt: new Intl.DateTimeFormat("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Nairobi",
      }).format(order.createdAt),
    },
  });
}
