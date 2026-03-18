import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import requireAuth from "../../middleware/auth.js";
import { updateOrderStatus, ORDER_STATUS } from "../../lib/orderStatus.js";
import { sendNotification } from "../../lib/notificationService.js";
import Rider from "../../models/Rider.js";
import { isRuakaLaunchModeEnabled } from "../../lib/launchMode.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const user = requireAuth(req);
  await connectDB();

  const { pickupLng, pickupLat, address, dropoff, dropoffLat, dropoffLng } = req.body;

  /* Time Validation */
  // Late orders are allowed; no blocking here.

  /* New: Handle Vendor Order */
  const { vendorId, items } = req.body;

  /* Pricing Calculation */
  const { calculateOrderPricing } = await import("../../lib/pricing.js");
  const goodsTotal = items ? items.reduce((sum, i) => sum + i.price, 0) : 0;

  // Create pricing breakdown
  const now = new Date();
  const isLate = now.getHours() >= 21;
  const pricingOverrides = isLate ? { baseFee: 80, perKmFee: 50 } : {};

  const { pricing, distribution } = await calculateOrderPricing(
    goodsTotal,
    { lat: pickupLat, lng: pickupLng },
    { lat: dropoffLat || -1.2921, lng: dropoffLng || 36.8219 }, // Use provided dropoff or fallback
    pricingOverrides
  );

  const Vendor = (await import("../../models/Vendor.js")).default;
  const vendorProfile = vendorId ? await Vendor.findById(vendorId) : null;
  if (vendorProfile?.isManuallyClosed || (vendorProfile && !vendorProfile.isOpen)) {
    return res.status(400).json({ error: "Vendor is currently closed for orders." });
  }

  const orderData = {
    userId: user.id,
    vendorId: vendorId || null,
    items: items || [],
    pickup: {
      address,
      location: {
        type: "Point",
        coordinates: [pickupLng, pickupLat]
      }
    },
    dropoff: {
      address: typeof dropoff === 'string' ? dropoff : (dropoff?.address || "Client Location"),
      location: {
        type: "Point",
        coordinates: [dropoffLng || 36.8219, dropoffLat || -1.2921]
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
    lateOrder: isLate,

    isDeliveryFeePaid: false,
    completionOtp: Math.floor(1000 + Math.random() * 9000).toString()
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

  await sendNotification({
    recipientId: user.id,
    recipientType: "USER",
    title: "Order confirmed",
    body: "Your order has been received and is awaiting payment confirmation.",
    data: { orderId: String(order._id), status: ORDER_STATUS.PAYMENT_PENDING },
    eventType: "ORDER_CONFIRMED",
    deepLink: "/orders",
    orderId: String(order._id),
    type: "ALERT",
    category: "orderUpdates",
    io: req.app.get("io"),
  });

  if (isRuakaLaunchModeEnabled() && vendorProfile) {
    const primaryRider = await Rider.findOne({ locationName: "Ruaka" }).sort({ currentOrders: 1, createdAt: 1 });
    const io = req.app.get("io");

    if (primaryRider?.isOnline && primaryRider?.isAvailable) {
      await updateOrderStatus({
        orderId: order._id,
        fromStatusRaw: ORDER_STATUS.PAYMENT_PENDING,
        toStatus: ORDER_STATUS.RIDER_ASSIGNED,
        actor: { role: "system", name: "ruaka_launch_assignment" },
        source: "orders.create.ruaka_launch",
        io,
        set: { riderId: primaryRider._id, riderAssignedAt: new Date() },
      });

      primaryRider.isAvailable = false;
      primaryRider.currentOrders = 1;
      primaryRider.status = "ONLINE_BUSY";
      await primaryRider.save();

      const deliveryRequestPayload = {
        orderId: String(order._id),
        _id: String(order._id),
        status: ORDER_STATUS.RIDER_ASSIGNED,
        title: "New Delivery in Ruaka",
        body: "You have a new order request",
        pickupAddress: address || "Ruaka pickup",
        estimatedEarnings: Number(pricing.deliveryFee || 0),
        acceptBy: Date.now() + 30000,
      };

      io?.emit(`rider:order:${primaryRider.userId}`, deliveryRequestPayload);
      io?.to(`rider:${primaryRider.userId}`).emit("delivery:request", deliveryRequestPayload);
      io?.to(`rider:${primaryRider.userId}`).emit("rider:new_order", deliveryRequestPayload);

      await sendNotification({
        recipientId: primaryRider.userId,
        recipientType: "RIDER",
        title: "New Delivery in Ruaka",
        body: "You have a new order request",
        data: { orderId: String(order._id) },
        eventType: "NEW_DELIVERY_REQUEST",
        deepLink: "/rider/dashboard",
        orderId: String(order._id),
        type: "ALERT",
        category: "orderUpdates",
        io,
      });

      await sendNotification({
        recipientId: user.id,
        recipientType: "USER",
        title: "Your rider is on the way",
        body: "A rider in Ruaka has been assigned to your order.",
        data: { orderId: String(order._id) },
        eventType: "RIDER_ASSIGNED",
        deepLink: "/orders",
        orderId: String(order._id),
        type: "ALERT",
        category: "orderUpdates",
        io,
      });

      await sendNotification({
        recipientId: user.id,
        recipientType: "USER",
        title: "Rider is available in your area (Ruaka)",
        body: "We have an active rider available for your deliveries.",
        data: { area: "Ruaka" },
        eventType: "RIDER_AVAILABLE_RUAKA",
        deepLink: "/order",
        type: "ALERT",
        category: "systemAlerts",
        io,
      });
    } else {
      await updateOrderStatus({
        orderId: order._id,
        fromStatusRaw: ORDER_STATUS.PAYMENT_PENDING,
        toStatus: ORDER_STATUS.PENDING_RIDER,
        actor: { role: "system", name: "ruaka_launch_assignment" },
        source: "orders.create.ruaka_launch",
        reason: "NO_RIDER_AVAILABLE",
        io,
      });

      await sendNotification({
        recipientId: user.id,
        recipientType: "USER",
        title: "No rider available at the moment",
        body: "Your order is pending rider assignment.",
        data: { orderId: String(order._id) },
        eventType: "PENDING_RIDER",
        deepLink: "/orders",
        orderId: String(order._id),
        type: "ALERT",
        category: "orderUpdates",
        io,
      });

      io?.emit("admin:order:pending_rider", {
        orderId: String(order._id),
        reason: "NO_RIDER_AVAILABLE",
        message: "No rider available at the moment",
      });
    }
  }

  // NOTE: Vendor Notification is DEFERRED until Payment is Confirmed.
  // See: api/payments/mpesaController.js -> handleMpesaCallback

  res.status(201).json({ order, suggestedRiders: [], assignedTo: null });
}
