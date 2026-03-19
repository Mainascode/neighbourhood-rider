import express from "express";
import Order from "../../models/Order.js";
import OrderStatusLog from "../../models/OrderStatusLog.js";
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
    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (![ORDER_STATUS.PROCESSING, ORDER_STATUS.ON_THE_WAY, ORDER_STATUS.DELIVERED].includes(normalizedStatus)) {
      return res.status(400).json({ error: "Invalid status update" });
    }

    let currentStatus = normalizeOrderStatus(order.status);

    if (currentStatus === normalizedStatus) {
      return res.json(order);
    }

    if (
      order.paid &&
      [ORDER_STATUS.CREATED, ORDER_STATUS.PAYMENT_PENDING, ORDER_STATUS.PAYMENT_CONFIRMED].includes(currentStatus)
    ) {
      order.status = ORDER_STATUS.PAID;
      order.statusUpdatedAt = new Date();
      await order.save();
      currentStatus = ORDER_STATUS.PAID;
    }

    let updatedOrder;

    try {
      updatedOrder = await updateOrderStatus({
        orderId: order._id,
        fromStatusRaw: order.status,
        toStatus: normalizedStatus,
        actor: { id: req.user?._id, role: req.user?.role, name: req.user?.name },
        source: "admin.orders.status",
        io: req.app.get("io"),
        set: normalizedStatus === ORDER_STATUS.DELIVERED ? { deliveredAt: new Date(), isReceived: true } : {},
      });
    } catch (err) {
      if (err.code !== "INVALID_TRANSITION") {
        throw err;
      }

      const set = {
        status: normalizedStatus,
        statusUpdatedAt: new Date(),
      };

      if (normalizedStatus === ORDER_STATUS.DELIVERED) {
        set.deliveredAt = new Date();
        set.isReceived = true;
      }

      updatedOrder = await Order.findByIdAndUpdate(order._id, { $set: set }, { new: true });

      await OrderStatusLog.create({
        orderId: order._id,
        fromStatus: currentStatus,
        toStatus: normalizedStatus,
        actorId: req.user?._id,
        actorRole: req.user?.role,
        actorName: req.user?.name,
        source: "admin.orders.status.override",
        reason: "LEGACY_STATUS_OVERRIDE",
      });
    }

    res.json(updatedOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

export default router;
