import { connectDB } from "../../lib/db.js";
import Rider from "../../models/Rider.js";
import requireAuth from "../../middleware/requireAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const user = requireAuth(req);
  const { lng, lat } = req.body;

  await connectDB();

  await Rider.findOneAndUpdate(
    { userId: user.id },
    {
      location: {
        type: "Point",
        coordinates: [lng, lat]
      }
    }
  );

  res.status(200).json({ ok: true });
}
