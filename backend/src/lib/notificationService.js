import Notification from "../models/Notification.js";
import NotificationPreference from "../models/NotificationPreference.js";
import User from "../models/User.js";
import { sendPushNotification } from "./push.js";

function toRecipientType(role = "user") {
  const normalized = String(role || "user").toUpperCase();
  return normalized === "ADMIN" ? "ADMIN" : "USER";
}

function shouldSendPush(preferences, category) {
  if (!category) return true;
  if (!preferences) return true;
  if (category === "orderUpdates") return preferences.orderUpdates !== false;
  if (category === "promotions") return preferences.promotions !== false;
  if (category === "systemAlerts") return preferences.systemAlerts !== false;
  return true;
}

function emitRealtimeNotification({ io, recipientId, recipientType, notification }) {
  if (!io || !recipientId || !recipientType || !notification) return;

  io.to(`notify:${String(recipientType).toUpperCase()}:${recipientId}`).emit("notification:new", notification);

  if (notification.eventType) {
    io.to(`notify:${String(recipientType).toUpperCase()}:${recipientId}`).emit(
      `notification:${notification.eventType}`,
      notification
    );
  }
}

export async function createNotification({
  recipientId,
  recipientType,
  title,
  body,
  orderId,
  deepLink,
  eventType,
  data,
}) {
  if (!recipientId || !recipientType || !title || !body) {
    return null;
  }

  return Notification.create({
    recipientId,
    recipientType,
    type: "ALERT",
    eventType: eventType || "GENERIC",
    orderId: orderId ? String(orderId) : "",
    deepLink: deepLink || "",
    title,
    body,
    data: data || {},
  });
}

export async function sendNotification({
  recipientId,
  recipientType,
  title,
  body,
  data,
  io,
  type = "ALERT",
  eventType,
  orderId,
  deepLink,
  category,
}) {
  const normalizedRecipientType = String(recipientType || "USER").toUpperCase();
  const notification = await createNotification({
    recipientId,
    recipientType: normalizedRecipientType,
    title,
    body,
    orderId,
    deepLink,
    eventType,
    data: {
      ...(data || {}),
      ...(type ? { type } : {}),
      ...(category ? { category } : {}),
      ...(io ? { io: true } : {}),
    },
  });

  emitRealtimeNotification({
    io,
    recipientId,
    recipientType: normalizedRecipientType,
    notification,
  });

  if (notification && type === "ALERT") {
    try {
      const preferences = await NotificationPreference.findOne({
        recipientId,
        recipientType: normalizedRecipientType,
      })
        .select("orderUpdates promotions systemAlerts")
        .lean();

      if (shouldSendPush(preferences, category)) {
        await sendPushNotification(recipientId, title, body, deepLink || "/");
      }
    } catch (err) {
      console.error("Push notification send failed:", err.message || err);
    }
  }

  return notification;
}

export async function notifyAdmin({ title, body, orderId, deepLink = "/admin", eventType = "ADMIN_UPDATE", data = {} }) {
  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!adminEmail) {
    return null;
  }

  const admin = await User.findOne({ email: adminEmail }).select("_id role");
  if (!admin) {
    return null;
  }

  return createNotification({
    recipientId: admin._id,
    recipientType: toRecipientType(admin.role),
    title,
    body,
    orderId,
    deepLink,
    eventType,
    data,
  });
}

export async function notifyUser({ recipientId, title, body, orderId, deepLink = "/orders", eventType = "ORDER_UPDATE", data = {} }) {
  return createNotification({
    recipientId,
    recipientType: "USER",
    title,
    body,
    orderId,
    deepLink,
    eventType,
    data,
  });
}
