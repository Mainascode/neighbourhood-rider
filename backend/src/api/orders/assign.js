import { connectDB } from "../../lib/db.js";
import Order from "../../models/Order.js";
import Rider from "../../models/Rider.js";

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

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(403).json({ error: e.message });
  }
}
