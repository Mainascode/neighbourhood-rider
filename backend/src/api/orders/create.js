import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import SystemSetting from "../../models/SystemSetting.js";
import requireAuth from "../../middleware/auth.js";
import { updateOrderStatus, ORDER_STATUS } from "../../lib/orderStatus.js";
import { notifyAdmin, notifyUser } from "../../lib/notificationService.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const user = requireAuth(req);
  await connectDB();

  const { pickupLng, pickupLat, address, dropoff, dropoffLat, dropoffLng, isScheduled, scheduledFor } = req.body;

  /* Time Validation */
  // Late orders are allowed; no blocking here.

  /* New: Handle Vendor Order */
  const { vendorId, items = [] } = req.body;
  const normalizedItems = Array.isArray(items)
    ? items.map((item) => ({
      _id: item._id,
      name: item.name,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      image: item.image || "",
      category: item.category || "",
    }))
    : [];

  if (!normalizedItems.length) {
    return res.status(400).json({ error: "At least one item is required" });
  }

  /* Pricing Calculation */
  const { calculateOrderPricing } = await import("../../lib/pricing.js");
  const goodsTotal = normalizedItems.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity || 1)), 0);

  // Create pricing breakdown
  const { pricing, distribution } = await calculateOrderPricing(
    goodsTotal,
    { lat: pickupLat, lng: pickupLng },
    { lat: dropoffLat || -1.2667, lng: dropoffLng || 36.7383 }
  );
  let settings = await SystemSetting.findOne({ key: "global_config" });
  if (!settings) {
    settings = await SystemSetting.create({});
  }

  const orderData = {
    userId: user.id,
    vendorId: vendorId || null,
    items: normalizedItems,
    pickup: {
      address: address || "Ruaka - Gathigi Estate",
      location: {
        type: "Point",
        coordinates: [pickupLng || 36.7383, pickupLat || -1.2667]
      }
    },
    dropoff: {
      address: typeof dropoff === 'string' ? dropoff : (dropoff?.address || "Ruaka - Gathigi Estate"),
      location: {
        type: "Point",
        coordinates: [dropoffLng || 36.7383, dropoffLat || -1.2667]
      }
    },
    status: ORDER_STATUS.CREATED,

    // Financials
    pricing,
    distribution,
    goodsTotal: pricing.goodsTotal,
    deliveryFee: pricing.deliveryFee,
    amount: pricing.totalCost,
    etaMinutes: pricing.etaMinutes,
    lateOrder: false,

    isDeliveryFeePaid: false,
    paymentMethod: "mpesa",
    completionOtp: Math.floor(1000 + Math.random() * 9000).toString(),
    isScheduled: Boolean(isScheduled),
    scheduledFor: scheduledFor || null,
    paymentData: {
      isRaining: Boolean(settings.isRaining),
    },
  };

  const order = await Order.create(orderData);

  await updateOrderStatus({
    orderId: order._id,
    fromStatusRaw: order.status,
    toStatus: ORDER_STATUS.PAYMENT_PENDING,
    actor: { id: user.id, role: user.role, name: user.name },
    source: "orders.create",
    io: req.app.get("io"),
  });

  await notifyUser({
    recipientId: user.id,
    title: "Order created",
    body: "Your order has been created. Complete M-Pesa payment to continue.",
    orderId: String(order._id),
    eventType: "ORDER_CREATED",
    data: { status: ORDER_STATUS.PAYMENT_PENDING },
  });
  await notifyAdmin({
    title: "New order created",
    body: `Order #${String(order._id).slice(-6)} is waiting for payment.`,
    orderId: String(order._id),
    deepLink: "/admin/dashboard",
    eventType: "NEW_ORDER_CREATED",
  });

  res.status(201).json({ order, suggestedRiders: [], assignedTo: null });
}
