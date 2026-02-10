// backend/src/api/admin/analytics.js
import Order from "../../models/Order.js";

export default async function analytics(req, res) {
  const totalOrders = await Order.countDocuments();
  const completed = await Order.countDocuments({ status: "DELIVERED" });
  const delivering = await Order.countDocuments({ status: "ON_THE_WAY" });

  res.json({
    totalOrders,
    completed,
    delivering,
  });
}
