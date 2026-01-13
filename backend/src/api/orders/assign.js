import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import Rider from "../../models/Rider.js";
import { sendPushNotification } from "../../lib/push.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await connectDB();

    const { orderId, riderId } = req.body;

    await Order.findByIdAndUpdate(orderId, {
      riderId,
      status: "assigned"
    });

    await Rider.findByIdAndUpdate(riderId, {
      isAvailable: false
    });

    // 3. Notify Rider via Socket
    const io = req.app.get("io");
    if (io) {
      io.emit(`rider:order:${riderId}`, {
        _id: orderId,
        status: "assigned",
        message: "You have been assigned a new order! 📦"
      });
    }

    // 4. Send Push Notification to Rider's devices
    const rider = await Rider.findById(riderId);
    if (rider && rider.userId) {
      await sendPushNotification(
        rider.userId,
        "New Order Assigned! 📦",
        "You have been assigned a new order! Tap to view.",
        "/dashboard"
      );
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(403).json({ error: e.message });
  }
}
