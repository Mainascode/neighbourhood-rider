import connectDB from "../../../../../lib/db.js";
import Order from "../../../../../models/Order.js";
import Rating from "../../../../../models/Rating.js";
import { requireApiUser } from "../../../../../lib/api-auth.js";
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

  await Rating.create({
    orderId: order._id,
    userId: user.id,
    rating: Number(body.rating),
    feedback: String(body.feedback || ""),
  });

  return ok({ message: "Rating saved." }, { status: 201 });
}
