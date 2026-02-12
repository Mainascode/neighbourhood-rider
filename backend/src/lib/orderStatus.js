import OrderStatusLog from "../models/OrderStatusLog.js";
import Order from "../models/Order.js";
import { sendNotification } from "./notificationService.js";

export const ORDER_STATUS = {
  CREATED: "CREATED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
  VENDOR_ACCEPTED: "VENDOR_ACCEPTED",
  PREPARING: "PREPARING",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  RIDER_ASSIGNED: "RIDER_ASSIGNED",
  ON_THE_WAY: "ON_THE_WAY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
};

export const ORDER_STATUSES = Object.values(ORDER_STATUS);

const STATUS_MESSAGES = {
  [ORDER_STATUS.PAYMENT_PENDING]: "Confirming payment",
  [ORDER_STATUS.PREPARING]: "Vendor is preparing your order",
  [ORDER_STATUS.ON_THE_WAY]: "Rider is on the way",
  [ORDER_STATUS.PAYMENT_CONFIRMED]: "Payment confirmed",
  [ORDER_STATUS.VENDOR_ACCEPTED]: "Vendor accepted your order",
  [ORDER_STATUS.READY_FOR_PICKUP]: "Order ready for pickup",
  [ORDER_STATUS.RIDER_ASSIGNED]: "Rider assigned to your order",
  [ORDER_STATUS.DELIVERED]: "Order delivered",
  [ORDER_STATUS.CANCELLED]: "Order cancelled",
  [ORDER_STATUS.REFUNDED]: "Order refunded",
  [ORDER_STATUS.CREATED]: "Order created",
};

export function getStatusMessage(status) {
  return STATUS_MESSAGES[status] || "Order update";
}

const ALLOWED_TRANSITIONS = {
  [ORDER_STATUS.CREATED]: [ORDER_STATUS.PAYMENT_PENDING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PAYMENT_PENDING]: [ORDER_STATUS.PAYMENT_CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PAYMENT_CONFIRMED]: [ORDER_STATUS.VENDOR_ACCEPTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.VENDOR_ACCEPTED]: [ORDER_STATUS.PREPARING],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY_FOR_PICKUP, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.READY_FOR_PICKUP]: [ORDER_STATUS.RIDER_ASSIGNED],
  [ORDER_STATUS.RIDER_ASSIGNED]: [ORDER_STATUS.ON_THE_WAY, ORDER_STATUS.READY_FOR_PICKUP],
  [ORDER_STATUS.ON_THE_WAY]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.REFUNDED]: [],
};

const LEGACY_STATUS_MAP = {
  pending: ORDER_STATUS.CREATED,
  payment_pending: ORDER_STATUS.PAYMENT_PENDING,
  payment_failed: ORDER_STATUS.PAYMENT_PENDING,
  pending_vendor: ORDER_STATUS.PAYMENT_CONFIRMED,
  preparing: ORDER_STATUS.PREPARING,
  ready_for_pickup: ORDER_STATUS.READY_FOR_PICKUP,
  assigned: ORDER_STATUS.RIDER_ASSIGNED,
  picking_up: ORDER_STATUS.RIDER_ASSIGNED,
  delivering: ORDER_STATUS.ON_THE_WAY,
  delivered: ORDER_STATUS.DELIVERED,
  completed: ORDER_STATUS.DELIVERED,
  cancelled: ORDER_STATUS.CANCELLED,
};

export function normalizeOrderStatus(status) {
  if (!status) return status;
  const upper = String(status).toUpperCase();
  if (ORDER_STATUSES.includes(upper)) return upper;
  const lower = String(status).toLowerCase();
  return LEGACY_STATUS_MAP[lower] || status;
}

function canCancel(fromStatus, actorRole) {
  if (fromStatus === ORDER_STATUS.REFUNDED) return false;
  if (fromStatus === ORDER_STATUS.DELIVERED) {
    return actorRole === "admin";
  }
  return true;
}

export function isValidTransition(fromStatus, toStatus, actorRole) {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return false;

  if (toStatus === ORDER_STATUS.CANCELLED) {
    return canCancel(fromStatus, actorRole);
  }

  const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

export async function updateOrderStatus({
  orderId,
  fromStatusRaw,
  toStatus,
  actor,
  source,
  reason,
  io,
  preconditions = {},
  set = {},
}) {
  if (!orderId) {
    const err = new Error("orderId is required");
    err.code = "MISSING_ORDER_ID";
    throw err;
  }

  const actorRole = actor?.role || "system";
  const rawFrom = fromStatusRaw;
  const normalizedFrom = normalizeOrderStatus(rawFrom);
  const normalizedTo = normalizeOrderStatus(toStatus);

  if (!ORDER_STATUSES.includes(normalizedTo)) {
    const err = new Error(`Invalid target status: ${toStatus}`);
    err.code = "INVALID_STATUS";
    throw err;
  }

  if (!ORDER_STATUSES.includes(normalizedFrom)) {
    const err = new Error(`Invalid current status: ${rawFrom}`);
    err.code = "INVALID_CURRENT_STATUS";
    throw err;
  }

  if (!isValidTransition(normalizedFrom, normalizedTo, actorRole)) {
    const err = new Error(`Invalid transition: ${normalizedFrom} -> ${normalizedTo}`);
    err.code = "INVALID_TRANSITION";
    throw err;
  }

  const now = new Date();
  const query = { _id: orderId, status: rawFrom, ...preconditions };
  const update = {
    $set: {
      status: normalizedTo,
      statusUpdatedAt: now,
      ...set,
    },
  };

  const updatedOrder = await Order.findOneAndUpdate(query, update, { new: true });
  if (!updatedOrder) {
    const err = new Error(`Order status update conflict for ${orderId}`);
    err.code = "STATUS_CONFLICT";
    throw err;
  }

  await OrderStatusLog.create({
    orderId,
    fromStatus: normalizedFrom,
    toStatus: normalizedTo,
    actorId: actor?.id,
    actorRole,
    actorName: actor?.name,
    source,
    reason,
  });

  if (io) {
    io.to(`order:${orderId}`).emit("order:update", updatedOrder);
    io.to(`order:${orderId}`).emit("order:status", {
      orderId,
      fromStatus: normalizedFrom,
      toStatus: normalizedTo,
      message: getStatusMessage(normalizedTo),
      at: now.toISOString(),
    });
  }

  try {
    const userId = updatedOrder.userId;
    const vendorId = updatedOrder.vendorId;
    const actorRole = actor?.role || "system";

    const userNotifications = {
      [ORDER_STATUS.PAYMENT_CONFIRMED]: {
        title: "Payment confirmed",
        body: "Your payment was confirmed. Waiting for vendor.",
        eventType: "PAYMENT_CONFIRMED",
        deepLink: "/orders",
      },
      [ORDER_STATUS.VENDOR_ACCEPTED]: {
        title: "Vendor accepted",
        body: "Your order was accepted by the vendor.",
        eventType: "VENDOR_ACCEPTED",
        deepLink: "/orders",
      },
      [ORDER_STATUS.PREPARING]: {
        title: "Order preparing",
        body: "The vendor is preparing your order.",
        eventType: "ORDER_PREPARING",
        deepLink: "/orders",
      },
      [ORDER_STATUS.RIDER_ASSIGNED]: {
        title: "Rider assigned",
        body: "A rider has been assigned to your order.",
        eventType: "RIDER_ASSIGNED",
        deepLink: "/orders",
      },
      [ORDER_STATUS.ON_THE_WAY]: {
        title: "Rider on the way",
        body: "Your rider is on the way.",
        eventType: "RIDER_ON_THE_WAY",
        deepLink: "/orders",
      },
      [ORDER_STATUS.DELIVERED]: {
        title: "Order delivered",
        body: "Your order has been delivered.",
        eventType: "ORDER_DELIVERED",
        deepLink: "/orders",
      },
      [ORDER_STATUS.CANCELLED]: {
        title: "Order cancelled",
        body: normalizedTo === ORDER_STATUS.CANCELLED && source === "vendors.cancel"
          ? "Your order was cancelled by the vendor."
          : "Your order was cancelled.",
        eventType: source === "vendors.cancel" ? "VENDOR_REJECTED" : "ORDER_CANCELLED",
        deepLink: "/orders",
      },
      [ORDER_STATUS.REFUNDED]: {
        title: "Refund initiated",
        body: "Your refund has been initiated.",
        eventType: "REFUND_INITIATED",
        deepLink: "/orders",
      },
    };

    if (userId && userNotifications[normalizedTo]) {
      const meta = userNotifications[normalizedTo];
      await sendNotification({
        recipientId: userId,
        recipientType: "USER",
        title: meta.title,
        body: meta.body,
        data: { orderId: String(orderId), status: normalizedTo },
        eventType: meta.eventType,
        deepLink: meta.deepLink,
        orderId: String(orderId),
        type: "ALERT",
        category: "orderUpdates",
        io,
      });
    }

    if (vendorId && normalizedTo === ORDER_STATUS.CANCELLED) {
      if (actorRole === "user" || actorRole === "system") {
        const Vendor = (await import("../models/Vendor.js")).default;
        const vendor = await Vendor.findById(vendorId).select("userId");
        if (vendor?.userId) {
          await sendNotification({
            recipientId: vendor.userId,
            recipientType: "VENDOR",
            title: "Order cancelled",
            body: "An order was cancelled by the customer or system.",
            data: { orderId: String(orderId), status: normalizedTo },
            eventType: "ORDER_CANCELLED",
            deepLink: "/vendor/dashboard",
            orderId: String(orderId),
            type: "ALERT",
            category: "orderUpdates",
            io,
          });
        }
      }
    }

    if (updatedOrder.riderId) {
      const Rider = (await import("../models/Rider.js")).default;
      const rider = await Rider.findById(updatedOrder.riderId).select("userId");
      if (rider?.userId) {
        if (normalizedTo === ORDER_STATUS.CANCELLED) {
          await sendNotification({
            recipientId: rider.userId,
            recipientType: "RIDER",
            title: "Order cancelled",
            body: "This order was cancelled.",
            data: { orderId: String(orderId), status: normalizedTo },
            eventType: "ORDER_CANCELLED",
            deepLink: "/rider/dashboard",
            orderId: String(orderId),
            type: "ALERT",
            category: "orderUpdates",
            io,
          });
        }
        if (normalizedTo === ORDER_STATUS.READY_FOR_PICKUP) {
          await sendNotification({
            recipientId: rider.userId,
            recipientType: "RIDER",
            title: "Pickup ready",
            body: "Order is ready for pickup.",
            data: { orderId: String(orderId), status: normalizedTo },
            eventType: "PICKUP_READY",
            deepLink: "/rider/dashboard",
            orderId: String(orderId),
            type: "ALERT",
            category: "orderUpdates",
            io,
          });
        }
        if (normalizedTo === ORDER_STATUS.DELIVERED) {
          await sendNotification({
            recipientId: rider.userId,
            recipientType: "RIDER",
            title: "Delivery completed",
            body: "You completed this delivery.",
            data: { orderId: String(orderId), status: normalizedTo },
            eventType: "DELIVERY_COMPLETED",
            deepLink: "/rider/dashboard",
            orderId: String(orderId),
            type: "ALERT",
            category: "orderUpdates",
            io,
          });
        }
      }
    }
  } catch (err) {
    console.error("Notification error:", err.message || err);
  }

  if (normalizedTo === ORDER_STATUS.CANCELLED && updatedOrder.riderId) {
    try {
      const Rider = (await import("../models/Rider.js")).default;
      await Rider.findByIdAndUpdate(updatedOrder.riderId, {
        status: "ONLINE_AVAILABLE",
        isAvailable: true,
      });
    } catch (err) {
      console.error("Failed to release rider on cancel:", err.message || err);
    }
  }

  return updatedOrder;
}

export async function updateOrderStatusFromOrder({
  order,
  toStatus,
  actor,
  source,
  reason,
  io,
  preconditions,
  set,
}) {
  if (!order) {
    const err = new Error("order is required");
    err.code = "MISSING_ORDER";
    throw err;
  }
  return updateOrderStatus({
    orderId: order._id,
    fromStatusRaw: order.status,
    toStatus,
    actor,
    source,
    reason,
    io,
    preconditions,
    set,
  });
}
