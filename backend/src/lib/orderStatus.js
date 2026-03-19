import OrderStatusLog from "../models/OrderStatusLog.js";
import Order from "../models/Order.js";
import { sendNotification } from "./notificationService.js";

export const ORDER_STATUS = {
  CREATED: "CREATED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
  PAID: "PAID",
  PROCESSING: "PROCESSING",
  ON_THE_WAY: "ON_THE_WAY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
  VENDOR_ACCEPTED: "VENDOR_ACCEPTED",
  PREPARING: "PREPARING",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  PENDING_RIDER: "PENDING_RIDER",
  RIDER_ASSIGNED: "RIDER_ASSIGNED",
};

export const ORDER_STATUSES = Object.values(ORDER_STATUS);

const STATUS_MESSAGES = {
  [ORDER_STATUS.PAYMENT_PENDING]: "Confirming payment",
  [ORDER_STATUS.PAYMENT_CONFIRMED]: "Payment confirmed",
  [ORDER_STATUS.PAID]: "Payment confirmed",
  [ORDER_STATUS.PROCESSING]: "Admin is preparing your order",
  [ORDER_STATUS.ON_THE_WAY]: "Your order is on the way",
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
  [ORDER_STATUS.PAYMENT_PENDING]: [ORDER_STATUS.PAYMENT_CONFIRMED, ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PAYMENT_CONFIRMED]: [ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PAID]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.ON_THE_WAY, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ON_THE_WAY]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.REFUNDED]: [],
};

const LEGACY_STATUS_MAP = {
  pending: ORDER_STATUS.CREATED,
  payment_pending: ORDER_STATUS.PAYMENT_PENDING,
  payment_failed: ORDER_STATUS.PAYMENT_PENDING,
  pending_vendor: ORDER_STATUS.PAID,
  paid: ORDER_STATUS.PAID,
  processing: ORDER_STATUS.PROCESSING,
  preparing: ORDER_STATUS.PREPARING,
  ready_for_pickup: ORDER_STATUS.PROCESSING,
  pending_rider: ORDER_STATUS.PROCESSING,
  assigned: ORDER_STATUS.PROCESSING,
  picking_up: ORDER_STATUS.PROCESSING,
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
        body: "Your payment was confirmed.",
        eventType: "PAYMENT_CONFIRMED",
        deepLink: "/orders",
      },
      [ORDER_STATUS.PAID]: {
        title: "Payment confirmed",
        body: "Your order has been paid and is waiting for processing.",
        eventType: "ORDER_PAID",
        deepLink: "/orders",
      },
      [ORDER_STATUS.PROCESSING]: {
        title: "Order processing",
        body: "Neighbourhood Rider is preparing your order.",
        eventType: "ORDER_PROCESSING",
        deepLink: "/orders",
      },
      [ORDER_STATUS.ON_THE_WAY]: {
        title: "Order on the way",
        body: "Your order is on the way.",
        eventType: "ORDER_ON_THE_WAY",
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
  } catch (err) {
    console.error("Notification error:", err.message || err);
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
