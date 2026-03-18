import { redirect } from "next/navigation";
import connectDB from "../../lib/db.js";
import { getCurrentUser } from "../../lib/auth.js";
import Order from "../../models/Order.js";
import Rating from "../../models/Rating.js";
import OrdersPage from "../../components/orders-page.js";

export const dynamic = "force-dynamic";

export default async function OrdersScreen({ searchParams }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  const params = await searchParams;

  await connectDB();
  const [orders, ratings] = await Promise.all([
    Order.find({ userId: user.id }).sort({ createdAt: -1 }).lean(),
    Rating.find({ userId: user.id }).lean(),
  ]);

  const ratedOrderIds = new Set(ratings.map((rating) => rating.orderId.toString()));

  return (
    <OrdersPage
      highlight={params?.highlight || ""}
      initialOrders={orders.map((order) => ({
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
        items: order.items.map((item) => ({
          productId: item.productId.toString(),
          name: item.name,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })),
        ratingSubmitted: ratedOrderIds.has(order._id.toString()),
      }))}
    />
  );
}
