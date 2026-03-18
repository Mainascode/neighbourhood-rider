import connectDB from "../../../../lib/db.js";
import { requireApiAdmin } from "../../../../lib/api-auth.js";
import { ensureDefaultProducts, ensureSystemSettings } from "../../../../lib/bootstrap.js";
import Product from "../../../../models/Product.js";
import Order from "../../../../models/Order.js";
import Payment from "../../../../models/Payment.js";
import Rating from "../../../../models/Rating.js";
import { fail, ok } from "../../../../lib/response.js";

export async function GET() {
  const admin = await requireApiAdmin();
  if (!admin) {
    return fail("Unauthorized.", 401);
  }

  await connectDB();
  const settings = await ensureSystemSettings();
  await ensureDefaultProducts();
  const [products, orders, payments, ratings] = await Promise.all([
    Product.find().sort({ createdAt: -1 }).lean(),
    Order.find().sort({ createdAt: -1 }).limit(12).lean(),
    Payment.find().sort({ createdAt: -1 }).limit(12).lean(),
    Rating.find().populate("orderId", "customerName").populate("userId", "name").sort({ createdAt: -1 }).limit(12).lean(),
  ]);

  return ok({
    settings: { weather: settings.weather },
    metrics: {
      orders: await Order.countDocuments(),
      paidPayments: await Payment.countDocuments({ status: "paid" }),
      ratings: await Rating.countDocuments(),
      revenue: await Payment.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).then((result) => result[0]?.total || 0),
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
      receiptNumber: payment.receiptNumber,
      createdAtLabel: new Intl.DateTimeFormat("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Nairobi",
      }).format(payment.createdAt),
    })),
    ratings: ratings.map((rating) => ({
      id: rating._id.toString(),
      customerName: rating.orderId?.customerName || "Customer",
      userName: rating.userId?.name || "User",
      rating: rating.rating,
      feedback: rating.feedback,
    })),
  });
}
