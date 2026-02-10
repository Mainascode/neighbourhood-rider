import Order from "../models/Order.js";
import Vendor from "../models/Vendor.js";
import { updateOrderStatus, ORDER_STATUS } from "../lib/orderStatus.js";
import { sendNotification } from "../lib/notificationService.js";
import { recordOverdueDelivery } from "../lib/penalties.js";

const JOB_INTERVAL_MS = 60 * 1000;

export function startOrderRecoveryJob(io) {
  setInterval(async () => {
    const now = new Date();

    try {
      // PAYMENT_PENDING > 5 min => CANCELLED
      const paymentTimeoutCutoff = new Date(now.getTime() - 5 * 60 * 1000);
      const pendingOrders = await Order.find({
        status: ORDER_STATUS.PAYMENT_PENDING,
        statusUpdatedAt: { $lte: paymentTimeoutCutoff },
      }).limit(50);

      for (const order of pendingOrders) {
        try {
          await updateOrderStatus({
            orderId: order._id,
            fromStatusRaw: order.status,
            toStatus: ORDER_STATUS.CANCELLED,
            actor: { role: "system", name: "order_recovery_job" },
            source: "jobs.order-recovery",
            reason: "PAYMENT_TIMEOUT",
            io,
          });
        } catch (err) {
          console.error("Failed to cancel payment timeout order:", err.message);
        }
      }

      // PREPARING > prepTime + 10 min => alert vendor
      const preparingOrders = await Order.find({
        status: ORDER_STATUS.PREPARING,
        prepAlertedAt: { $exists: false },
        statusUpdatedAt: { $exists: true },
      }).limit(50);

      for (const order of preparingOrders) {
        const prepMinutes = order.prepTimeMinutes || 20;
        const overdueCutoff = new Date(order.statusUpdatedAt.getTime() + (prepMinutes + 10) * 60 * 1000);
        if (now < overdueCutoff) continue;

        try {
          const vendor = await Vendor.findById(order.vendorId);
          if (vendor?.userId) {
            if (io) {
              io.to(`vendor:${vendor.userId}`).emit("vendor:prep_overdue", {
                orderId: order._id,
                message: "Order prep is overdue.",
              });
            }
            await sendNotification({
              recipientId: vendor.userId,
              recipientType: "VENDOR",
              title: "Prep time overdue",
              body: `Order #${order._id.toString().slice(-6)} is overdue. Please update.`,
              data: { orderId: String(order._id) },
              eventType: "PREP_DELAY_ALERT",
              deepLink: "/vendor/dashboard",
              orderId: String(order._id),
              type: "ALERT",
              category: "systemAlerts",
              io,
            });
          }
          order.prepAlertedAt = now;
          await order.save();
        } catch (err) {
          console.error("Failed to alert vendor for prep overdue:", err.message);
        }
      }

      // ON_THE_WAY > 2x ETA => flag rider
      const onTheWayOrders = await Order.find({
        status: ORDER_STATUS.ON_THE_WAY,
        overdueFlaggedAt: { $exists: false },
        etaMinutes: { $exists: true, $ne: null },
        statusUpdatedAt: { $exists: true },
      }).limit(50);

      for (const order of onTheWayOrders) {
        const etaMinutes = order.etaMinutes;
        if (!etaMinutes || !order.statusUpdatedAt) continue;
        const overdueCutoff = new Date(order.statusUpdatedAt.getTime() + etaMinutes * 2 * 60 * 1000);
        if (now < overdueCutoff) continue;

        try {
          if (order.riderId) {
            await recordOverdueDelivery(order.riderId);
          }
          order.overdueFlaggedAt = now;
          await order.save();
          if (io) {
            io.emit("admin:order:overdue", {
              orderId: order._id,
              riderId: order.riderId,
            });
          }
        } catch (err) {
          console.error("Failed to flag overdue rider:", err.message);
        }
      }
    } catch (err) {
      console.error("Order recovery job error:", err.message);
    }
  }, JOB_INTERVAL_MS);
}
