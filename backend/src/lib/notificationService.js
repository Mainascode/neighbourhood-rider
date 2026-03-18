import Notification from "../models/Notification.js";
import User from "../models/User.js";

function toRecipientType(role = "user") {
  const normalized = String(role || "user").toUpperCase();
  return normalized === "ADMIN" ? "ADMIN" : "USER";
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
  return createNotification({
    recipientId,
    recipientType: String(recipientType || "USER").toUpperCase(),
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
