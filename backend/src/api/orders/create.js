import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import requireAuth from "../../middleware/auth.js";
import { sendPushNotification } from "../../lib/push.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const user = requireAuth(req);
  await connectDB();

  const { pickupLng, pickupLat, address, dropoff, dropoffLat, dropoffLng } = req.body;

  /* Time Validation */
  const now = new Date();
  const currentHour = now.getHours();
  // Operating Hours: 06:00 - 21:00
  if ((currentHour < 6 || currentHour >= 21) && !req.body.isScheduled) {
    return res.status(400).json({
      error: "Vendors operate between 6:00 AM and 9:00 PM",
      systemClosed: true
    });
  }

  /* New: Handle Vendor Order */
  const { vendorId, items } = req.body;

  /* Pricing Calculation */
  const { calculateOrderPricing } = await import("../../lib/pricing.js");
  const goodsTotal = items ? items.reduce((sum, i) => sum + i.price, 0) : 0;

  // Create pricing breakdown
  const { pricing, distribution } = await calculateOrderPricing(
    goodsTotal,
    { lat: pickupLat, lng: pickupLng },
    { lat: dropoffLat || -1.2921, lng: dropoffLng || 36.8219 } // Use provided dropoff or fallback
  );

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
    status: "payment_pending",

    // Financials
    pricing,
    distribution,
    goodsTotal: pricing.goodsTotal,
    deliveryFee: pricing.deliveryFee,
    amount: pricing.totalCost,

    isDeliveryFeePaid: false,
    completionOtp: Math.floor(1000 + Math.random() * 9000).toString()
  };

  const order = await Order.create(orderData);

  // NOTE: Vendor Notification is DEFERRED until Payment is Confirmed.
  // See: api/payments/mpesaController.js -> handleMpesaCallback

  const matchResult = await matchOrder(order._id, { lat: pickupLat, lng: pickupLng }, 1, [], io);

  let assignedRiderName = null;
  if (matchResult.success && matchResult.rider) {
    assignedRiderName = matchResult.rider.name;

    // Send Push Notification (matchOrder emits socket, but push is good too)
    await sendPushNotification(
      matchResult.rider.userId,
      "New Delivery Request! 📦",
      "Generic errand request. Tap to accept.",
      "/rider/orders"
    );
  }

  // We can still return suggested riders if needed, but matchOrder finds the best one.
  // We'll leave suggestedRiders empty or fetch them if strictly required for UI (but UI seems to rely on assignment status now)
  const riders = [];

  res.status(201).json({ order, suggestedRiders: riders, assignedTo: assignedRiderName });
}
