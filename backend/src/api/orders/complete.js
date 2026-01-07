// backend/src/api/orders/complete.js
import Order from "../../models/Order.js";

export default async function completeOrder(req, res) {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ message: "Order not found" });

  if (order.status !== "Delivered")
    return res.status(400).json({ message: "Not delivered yet" });

  order.status = "Completed";
  order.paid = true;

  await order.save();

  res.json({ success: true });
}
