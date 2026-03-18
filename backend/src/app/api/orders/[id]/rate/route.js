import connectDB from "../../../../../lib/db.js";
import Order from "../../../../../models/Order.js";
import Rating from "../../../../../models/Rating.js";
import { requireApiUser } from "../../../../../lib/api-auth.js";
import { notifyAdmin } from "../../../../../lib/notificationService.js";
import { fail, ok } from "../../../../../lib/response.js";

export async function POST(request, { params }) {
  const user = await requireApiUser();
  if (!user) {
    return fail("Unauthorized.", 401);
  }

  const body = await request.json();
  await connectDB();
  const order = await Order.findById(params.id);

  if (!order || order.userId.toString() !== user.id) {
    return fail("Order not found.", 404);
  }

  if (order.status !== "delivered") {
    return fail("Only delivered orders can be rated.");
  }

  const existingRating = await Rating.findOne({ orderId: order._id });
  if (existingRating) {
    return fail("Rating already submitted.", 409);
  }

  const rating = await Rating.create({
    orderId: order._id,
    userId: user.id,
    rating: Number(body.rating),
    feedback: String(body.feedback || ""),
  });

  await notifyAdmin({
    eventType: "DELIVERY_RATED",
    orderId: order._id,
    title: "New delivery rating",
    body: `${user.name || "A customer"} rated order #${order._id.toString().slice(-6)} ${rating.rating}/5.`,
    deepLink: "/admin",
    data: { senderId: user.id },
  });

  return ok({ message: "Rating saved." }, { status: 201 });
}
