import connectDB from "../../../lib/db.js";
import Order from "../../../models/Order.js";
import Rating from "../../../models/Rating.js";
import { requireApiUser } from "../../../lib/api-auth.js";
import { fail, ok } from "../../../lib/response.js";

export async function GET() {
  const user = await requireApiUser();
  if (!user) {
    return fail("Unauthorized.", 401);
  }

  await connectDB();
  const [orders, ratings] = await Promise.all([
    Order.find({ userId: user.id }).sort({ createdAt: -1 }).lean(),
    Rating.find({ userId: user.id }).lean(),
  ]);
  const ratedOrderIds = new Set(ratings.map((rating) => rating.orderId.toString()));

  return ok({
    orders: orders.map((order) => ({
      id: order._id.toString(),
      area: order.area,
      address: order.address,
      status: order.status,
      paymentStatus: order.paymentStatus,
      deliveryFee: order.deliveryFee,
      totalPrice: order.totalPrice,
      createdAtLabel: new Intl.DateTimeFormat("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Nairobi",
      }).format(order.createdAt),
      ratingSubmitted: ratedOrderIds.has(order._id.toString()),
      items: order.items.map((item) => ({
        productId: item.productId.toString(),
        name: item.name,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
    })),
  });
}
