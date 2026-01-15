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

  const orderData = {
    userId: user.id,
    vendorId: vendorId || null, // Link to vendor if present
    items: items || [], // Store items
    pickup: {
      address,
      location: {
        type: "Point",
        coordinates: [pickupLng, pickupLat]
      }
    },
    dropoff,
    status: vendorId ? "pending_vendor" : "pending", // Vendor needs to see it first
    amount: items ? items.reduce((sum, i) => sum + i.price, 50) : 50 // Calculate Amount + Delivery
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
