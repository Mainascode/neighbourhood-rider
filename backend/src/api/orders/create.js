import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import requireAuth from "../../middleware/auth.js";
import { updateOrderStatus, ORDER_STATUS } from "../../lib/orderStatus.js";

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
  if (vendorProfile?.isManuallyClosed) {
    return res.status(400).json({ error: "Vendor is currently closed for orders." });
  }
  if (!isLate && vendorProfile && !vendorProfile.isOpen) {
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

  // NOTE: Vendor Notification is DEFERRED until Payment is Confirmed.
  // See: api/payments/mpesaController.js -> handleMpesaCallback

  res.status(201).json({ order, suggestedRiders: [], assignedTo: null });
}
