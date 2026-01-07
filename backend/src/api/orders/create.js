import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import { assignBestRider } from "../../lib/matchRider.js";
import { findNearestRiders } from "../../lib/matchRider.js";
import requireAuth from "../../middleware/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const user = requireAuth(req);
  await connectDB();

  const { pickupLng, pickupLat, address, dropoff } = req.body;

  const order = await Order.create({
    userId: user.id,
    pickup: {
      address,
      location: {
        type: "Point",
        coordinates: [pickupLng, pickupLat]
      }
    },
    dropoff
  });

  const riders = await findNearestRiders(pickupLng, pickupLat);

  // Auto Assign!
  const assignedRider = await assignBestRider(order);

  // If assigned, notify Rider immediately
  if (assignedRider) {
    const io = req.app.get("io");
    if (io) {
      io.to(`order:${order._id}`).emit("order:update", order);

      // Notify the specific rider via their User ID channel (which they listen to)
      io.emit(`rider:order:${assignedRider.userId}`, order);
    }
  }

  res.status(201).json({ order, suggestedRiders: riders, assignedTo: assignedRider?.name });
}
