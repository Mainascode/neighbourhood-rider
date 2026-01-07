// backend/src/api/admin/analytics.js
import Order from "../../models/Order.js";

export default async function analytics(req, res) {
  const totalOrders = await Order.countDocuments();
  const completed = await Order.countDocuments({ status: "Completed" });
  const delivering = await Order.countDocuments({ status: "Delivering" });

  res.json({
    totalOrders,
    completed,
    delivering,
  });
}
