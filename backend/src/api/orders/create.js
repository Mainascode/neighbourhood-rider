import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import { assignBestRider } from "../../lib/matchRider.js";
import { findNearestRiders } from "../../lib/matchRider.js";
import requireAuth from "../../middleware/auth.js";
import { sendPushNotification } from "../../lib/push.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const user = requireAuth(req);
  await connectDB();

  const { pickupLng, pickupLat, address, dropoff } = req.body;

  /* New: Handle Vendor Order */
  const { vendorId, items } = req.body;

  /* Pricing Calculation */
  const { calculateOrderPricing } = await import("../../lib/pricing.js");
  const goodsTotal = items ? items.reduce((sum, i) => sum + i.price, 0) : 0;

  // Create pricing breakdown
  const { pricing, distribution } = calculateOrderPricing(
    goodsTotal,
    { lat: pickupLat, lng: pickupLng },
    dropoff.location?.coordinates ? { lat: dropoff.location.coordinates[1], lng: dropoff.location.coordinates[0] } : { lat: -1.2921, lng: 36.8219 } // Fallback or geocode mock
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
    dropoff,
    status: vendorId ? "pending_vendor" : "pending",

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

  // If Vendor Order -> Notify Vendor, DO NOT Auto-Assign Rider yet (Vendor calls rider)
  const io = req.app.get("io");
  if (vendorId) {
    // Find Vendor's UserId to notify them personally
    // We need to fetch the vendor document to get the userId
    const Vendor = (await import("../../models/Vendor.js")).default;
    const vendorProfile = await Vendor.findById(vendorId);

    if (vendorProfile && io) {
      io.to(`vendor:${vendorProfile.userId}`).emit("vendor:order:new", order);
      await sendPushNotification(
        vendorProfile.userId,
        "New Shop Order! 🛍️",
        `Order #${order._id.slice(-6)} received. Amount: KES ${order.amount}`,
        "/vendor/dashboard"
      );
    }

    return res.status(201).json({ order, message: "Sent to Vendor" });
  }

  // Legacy/Chatbot Flow -> Auto Assign Rider
  const riders = await findNearestRiders(pickupLng, pickupLat);
  const assignedRider = await assignBestRider(order);

  if (assignedRider) {
    if (io) {
      io.to(`order:${order._id}`).emit("order:update", order);
      io.emit(`rider:order:${assignedRider.userId}`, order);
    }

    await sendPushNotification(
      assignedRider.userId,
      "New Delivery Request! 📦",
      "Generic errand request. Tap to accept.",
      "/rider/orders"
    );
  }

  res.status(201).json({ order, suggestedRiders: riders, assignedTo: assignedRider?.name });
}
