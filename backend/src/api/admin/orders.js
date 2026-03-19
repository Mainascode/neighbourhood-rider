import express from "express";
import Order from "../../models/Order.js";
import { ORDER_STATUS, normalizeOrderStatus, updateOrderStatus } from "../../lib/orderStatus.js";

const router = express.Router();

// GET all orders
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body || {};
    const normalizedStatus = normalizeOrderStatus(status);
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (![ORDER_STATUS.PROCESSING, ORDER_STATUS.ON_THE_WAY, ORDER_STATUS.DELIVERED].includes(normalizedStatus)) {
      return res.status(400).json({ error: "Invalid status update" });
    }

    const updatedOrder = await updateOrderStatus({
      orderId: order._id,
      fromStatusRaw: order.status,
      toStatus: normalizedStatus,
      actor: { id: req.user?._id, role: req.user?.role, name: req.user?.name },
      source: "admin.orders.status",
      io: req.app.get("io"),
      set: normalizedStatus === ORDER_STATUS.DELIVERED ? { deliveredAt: new Date(), isReceived: true } : {},
    });

    res.json(updatedOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

export default router;
