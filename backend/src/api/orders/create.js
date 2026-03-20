import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import requireAuth from "../../middleware/auth.js";
import OrderStatusLog from "../../models/OrderStatusLog.js";
import { ORDER_STATUS } from "../../lib/orderStatus.js";
import { notifyAdmin, notifyUser } from "../../lib/notificationService.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const user = requireAuth(req);
  await connectDB();

  const { vendorId, items = [] } = req.body;
  const normalizedItems = Array.isArray(items)
    ? items.map((item) => ({
      _id: item._id,
      name: item.name,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      image: item.image || "",
      category: item.category || "",
      note: String(item.note || "").trim(),
      userEstimatedPrice: Number(item.userEstimatedPrice ?? item.price) || 0,
    }))
    : [];

  if (!normalizedItems.length) {
    return res.status(400).json({ error: "At least one item is required" });
  }

  const estimatedTotal = normalizedItems.reduce((sum, item) => {
    return sum + (Number(item.userEstimatedPrice || 0) * Number(item.quantity || 1));
  }, 0);

  const orderData = {
    userId: user.id,
    vendorId: vendorId || null,
    items: normalizedItems,
    pickup: {
      address: "Shopping list request",
      location: {
        type: "Point",
        coordinates: [36.7383, -1.2667]
      }
    },
    dropoff: {
      address: "Customer delivery address",
      location: {
        type: "Point",
        coordinates: [36.7383, -1.2667]
      }
    },
    status: ORDER_STATUS.DRAFT,
    pricing: {
      goodsTotal: 0,
      deliveryFee: 0,
      serviceFee: 0,
      totalCost: 0,
    },
    distribution: {
      vendorPayout: 0,
      riderPayout: 0,
      adminRevenue: 0,
      splits: {
        vendor: 0,
        rider: 0,
        admin: 0,
      }
    },
    goodsTotal: 0,
    estimatedTotal,
    finalTotal: 0,
    deliveryFee: 0,
    amount: 0,
    etaMinutes: null,
    lateOrder: false,
    isDeliveryFeePaid: false,
    paymentMethod: "mpesa",
    completionOtp: Math.floor(1000 + Math.random() * 9000).toString(),
    isScheduled: false,
    scheduledFor: null,
    paymentData: {},
  };

  const order = await Order.create(orderData);
  console.log("ORDER STATUS:", order.status, String(order._id), "source=orders.create");

  await OrderStatusLog.create({
    orderId: order._id,
    fromStatus: ORDER_STATUS.DRAFT,
    toStatus: ORDER_STATUS.DRAFT,
    actorId: user.id,
    actorRole: user.role,
    actorName: user.name,
    source: "orders.create",
  });

  await notifyUser({
    recipientId: user.id,
    title: "Shopping list submitted",
    body: "Your request has been submitted. The admin will review it and send the final price.",
    orderId: String(order._id),
    eventType: "ORDER_DRAFT",
    data: { status: ORDER_STATUS.DRAFT },
  });
  await notifyAdmin({
    title: "New shopping list",
    body: `Order #${String(order._id).slice(-6)} is ready for admin review.`,
    orderId: String(order._id),
    deepLink: "/admin/dashboard",
    eventType: "NEW_ORDER_DRAFT",
  });

  res.status(201).json({
    success: true,
    order,
    suggestedRiders: [],
    assignedTo: null,
    message: "Shopping list submitted",
  });
}
