import connectDB from "../../lib/db.js";
import { requireAdminUser } from "../../lib/auth.js";
import { ensureDefaultProducts, ensureSystemSettings } from "../../lib/bootstrap.js";
import Product from "../../models/Product.js";
import Order from "../../models/Order.js";
import Payment from "../../models/Payment.js";
import Rating from "../../models/Rating.js";
import AdminPage from "../../components/admin-page.js";

export const dynamic = "force-dynamic";

export default async function AdminScreen() {
  await requireAdminUser();
  await connectDB();
  const settings = await ensureSystemSettings();
  await ensureDefaultProducts();

  const [products, orders, payments, ratings] = await Promise.all([
    Product.find().sort({ createdAt: -1 }).lean(),
    Order.find().sort({ createdAt: -1 }).limit(10).lean(),
    Payment.find().sort({ createdAt: -1 }).limit(10).lean(),
    Rating.find().sort({ createdAt: -1 }).limit(10).lean(),
  ]);
  const [orderCount, paidPaymentCount, ratingCount, revenueAgg] = await Promise.all([
    Order.countDocuments(),
    Payment.countDocuments({ status: "paid" }),
    Rating.countDocuments(),
    Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  return (
    <AdminPage
      initialOverview={{
        settings: { weather: settings.weather, isRaining: settings.isRaining },
        metrics: {
          orders: orderCount,
          paidPayments: paidPaymentCount,
          ratings: ratingCount,
          revenue: revenueAgg[0]?.total || 0,
        },
        products: products.map((product) => ({
          id: product._id.toString(),
          name: product.name,
          slug: product.slug,
          price: product.price,
          category: product.category,
          description: product.description,
          unit: product.unit,
          image: product.image,
        })),
        orders: orders.map((order) => ({
          id: order._id.toString(),
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          area: order.area,
          address: order.address,
          totalPrice: order.totalPrice,
          deliveryFee: order.deliveryFee,
          paymentStatus: order.paymentStatus,
          status: order.status,
          items: order.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            subtotal: item.subtotal,
          })),
          createdAtLabel: new Intl.DateTimeFormat("en-KE", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Africa/Nairobi",
          }).format(order.createdAt),
        })),
        payments: payments.map((payment) => ({
          id: payment._id.toString(),
          amount: payment.amount,
          status: payment.status,
          phone: payment.phone,
        })),
        ratings: ratings.map((rating) => ({
          id: rating._id.toString(),
          rating: rating.rating,
          feedback: rating.feedback,
        })),
      }}
    />
  );
}
