import express from "express";
import Order from "../../models/Order.js";
import OrderStatusLog from "../../models/OrderStatusLog.js";
import { ORDER_STATUS, normalizeOrderStatus, updateOrderStatus } from "../../lib/orderStatus.js";
import { calculateReviewDeliveryFee } from "../../lib/pricing.js";
import { notifyUser } from "../../lib/notificationService.js";

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
    const { status, action, finalItems = [] } = req.body || {};
    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    let currentStatus = normalizeOrderStatus(order.status);

    if (action === "review") {
      if (![ORDER_STATUS.DRAFT, ORDER_STATUS.AWAITING_CONFIRMATION].includes(currentStatus)) {
        return res.status(400).json({ error: "Only draft requests can be reviewed" });
      }

      const sanitizedFinalItems = Array.isArray(finalItems)
        ? finalItems
            .map((item) => ({
              _id: item._id,
              name: String(item.name || "").trim(),
              quantity: Math.max(1, Number(item.quantity) || 1),
              finalPrice: Math.max(0, Number(item.finalPrice ?? item.price) || 0),
              note: String(item.note || "").trim(),
              image: item.image || "",
              category: item.category || "",
              userEstimatedPrice: Math.max(0, Number(item.userEstimatedPrice) || 0),
            }))
            .filter((item) => item.name)
        : [];

      if (!sanitizedFinalItems.length) {
        return res.status(400).json({ error: "At least one final item is required" });
      }

      const totalItemsPrice = sanitizedFinalItems.reduce((sum, item) => {
        return sum + (Number(item.finalPrice) * Number(item.quantity));
      }, 0);
      const deliveryFee = Number(await calculateReviewDeliveryFee());
      const finalTotal = totalItemsPrice + deliveryFee;
      console.log("ORDER STATUS:", currentStatus, String(order._id), "source=admin.orders.review");

      const reviewSet = {
        finalItems: sanitizedFinalItems,
        goodsTotal: totalItemsPrice,
        deliveryFee,
        finalTotal,
        amount: finalTotal,
        reviewedAt: new Date(),
        pricing: {
          goodsTotal: totalItemsPrice,
          deliveryFee,
          serviceFee: 0,
          totalCost: finalTotal,
        },
        distribution: {
          vendorPayout: totalItemsPrice,
          riderPayout: deliveryFee,
          adminRevenue: finalTotal,
          splits: {
            vendor: totalItemsPrice,
            rider: deliveryFee,
            admin: finalTotal,
          },
        },
      };

      let updatedOrder;
      if (currentStatus === ORDER_STATUS.DRAFT) {
        updatedOrder = await updateOrderStatus({
          orderId: order._id,
          fromStatusRaw: order.status,
          toStatus: ORDER_STATUS.AWAITING_CONFIRMATION,
          actor: { id: req.user?._id, role: req.user?.role, name: req.user?.name },
          source: "admin.orders.review",
          io: req.app.get("io"),
          set: reviewSet,
        });
      } else {
        updatedOrder = await Order.findByIdAndUpdate(
          order._id,
          {
            $set: {
              ...reviewSet,
              status: ORDER_STATUS.AWAITING_CONFIRMATION,
              statusUpdatedAt: new Date(),
            },
          },
          { new: true }
        );

        await OrderStatusLog.create({
          orderId: order._id,
          fromStatus: ORDER_STATUS.AWAITING_CONFIRMATION,
          toStatus: ORDER_STATUS.AWAITING_CONFIRMATION,
          actorId: req.user?._id,
          actorRole: req.user?.role,
          actorName: req.user?.name,
          source: "admin.orders.review.update",
          reason: "QUOTE_UPDATED",
        });
      }

      await notifyUser({
        recipientId: updatedOrder.userId,
        title: "Final price ready",
        body: "The admin has reviewed your shopping list. Open your order to confirm and pay.",
        orderId: String(updatedOrder._id),
        eventType: "ORDER_AWAITING_CONFIRMATION",
      });

      return res.json(updatedOrder);
    }

    const normalizedStatus = normalizeOrderStatus(status);
    if (![ORDER_STATUS.SHOPPING, ORDER_STATUS.DELIVERING, ORDER_STATUS.DELIVERED].includes(normalizedStatus)) {
      return res.status(400).json({ error: "Invalid status update" });
    }

    if (currentStatus === normalizedStatus) {
      console.log("ORDER STATUS:", currentStatus, String(order._id), "source=admin.orders.status.noop");
      return res.json(order);
    }

    if (
      order.paid &&
      [ORDER_STATUS.CREATED, ORDER_STATUS.PAYMENT_PENDING, ORDER_STATUS.PAYMENT_CONFIRMED, ORDER_STATUS.AWAITING_CONFIRMATION].includes(currentStatus)
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

    console.log("ORDER STATUS:", updatedOrder.status, String(updatedOrder._id), "source=admin.orders.status");

    res.json(updatedOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

export default router;
