import Notification from "../models/Notification.js";
import DeviceToken from "../models/DeviceToken.js";
import NotificationPreference from "../models/NotificationPreference.js";
import Order from "../models/Order.js";
import Vendor from "../models/Vendor.js";
import Rider from "../models/Rider.js";

let adminApp = null;
let adminMessaging = null;

async function getMessaging() {
  if (adminMessaging) return adminMessaging;
  const admin = await import("firebase-admin");

  if (!adminApp) {
    const base64 = process.env.FCM_SERVICE_ACCOUNT_BASE64;
    const json = process.env.FCM_SERVICE_ACCOUNT_JSON;

    let credentials = null;
    if (base64) {
      const raw = Buffer.from(base64, "base64").toString("utf-8");
      credentials = JSON.parse(raw);
    } else if (json) {
      credentials = JSON.parse(json);
    }

    if (!credentials) {
      throw new Error("FCM credentials not configured");
    }

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
  }

  adminMessaging = admin.getMessaging(adminApp);
  return adminMessaging;
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
  category = "orderUpdates",
}) {
  if (!recipientId || !recipientType || !title || !body) return null;

  const normalizedRecipientType = String(recipientType).toUpperCase();
  const normalizedEventType = eventType || "GENERIC";
  const normalizedOrderId = orderId ? String(orderId) : null;

  // Security: verify recipient is authorized for the order
  if (normalizedOrderId) {
    const order = await Order.findById(normalizedOrderId).select("userId vendorId riderId");
    if (!order) return null;

    if (normalizedRecipientType === "USER") {
      if (order.userId?.toString() !== recipientId.toString()) return null;
    }
    if (normalizedRecipientType === "VENDOR") {
      const vendor = order.vendorId ? await Vendor.findById(order.vendorId).select("userId") : null;
      if (!vendor || vendor.userId?.toString() !== recipientId.toString()) return null;
    }
    if (normalizedRecipientType === "RIDER") {
      const rider = order.riderId ? await Rider.findById(order.riderId).select("userId") : null;
      if (!rider || rider.userId?.toString() !== recipientId.toString()) return null;
    }
  }

  const prefs = await NotificationPreference.findOne({
    recipientId,
    recipientType: normalizedRecipientType,
  }).lean();

  const allowed = prefs
    ? (category === "promotions" ? prefs.promotions :
       category === "systemAlerts" ? prefs.systemAlerts :
       prefs.orderUpdates)
    : true;

  if (!allowed) return null;

  // Throttle: max 1 notification per event type per order
  if (normalizedOrderId && normalizedEventType) {
    const existing = await Notification.findOne({
      recipientId,
      recipientType: normalizedRecipientType,
      orderId: normalizedOrderId,
      eventType: normalizedEventType,
    }).lean();
    if (existing) return null;
  }

  // Batch low-priority (promotions)
  if (category === "promotions") {
    const batchWindowMs = 10 * 60 * 1000;
    const cutoff = new Date(Date.now() - batchWindowMs);
    const existingBatch = await Notification.findOne({
      recipientId,
      recipientType: normalizedRecipientType,
      eventType: "PROMO_BATCH",
      createdAt: { $gte: cutoff },
    });
    if (existingBatch) {
      const count = Number(existingBatch.data?.count || 1) + 1;
      existingBatch.data = { ...(existingBatch.data || {}), count };
      existingBatch.body = `You have ${count} new promotions.`;
      await existingBatch.save();
      return existingBatch;
    }
  }

  const notification = await Notification.create({
    recipientId,
    recipientType: normalizedRecipientType,
    type,
    eventType: category === "promotions" ? "PROMO_BATCH" : normalizedEventType,
    orderId: normalizedOrderId,
    deepLink,
    title,
    body,
    data: {
      ...(data || {}),
      ...(normalizedOrderId ? { orderId: normalizedOrderId } : {}),
      ...(normalizedEventType ? { eventType: normalizedEventType } : {}),
      ...(deepLink ? { deepLink } : {}),
    },
  });

  console.log(
    `[notify] ${normalizedRecipientType} ${recipientId} event=${notification.eventType} order=${notification.orderId || "-"} type=${type}`
  );

  // Emit in-app notification via socket
  if (io) {
    io.to(`notify:${normalizedRecipientType}:${recipientId}`).emit("notification:new", {
      id: notification._id,
      recipientId,
      recipientType: normalizedRecipientType,
      type: notification.type,
      eventType: notification.eventType,
      orderId: notification.orderId,
      deepLink: notification.deepLink,
      title,
      body,
      data: notification.data,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    });
  }

  // Send via FCM to all tokens
  const tokens = await DeviceToken.find({ recipientId, recipientType: normalizedRecipientType })
    .select("deviceToken")
    .lean();

  if (!tokens.length) return notification;

  const baseData = Object.fromEntries(
    Object.entries({
      ...(data || {}),
      ...(normalizedOrderId ? { orderId: normalizedOrderId } : {}),
      ...(normalizedEventType ? { eventType: normalizedEventType } : {}),
      ...(deepLink ? { deepLink } : {}),
    }).map(([k, v]) => [k, String(v)])
  );

  let pendingTokens = tokens.map(t => t.deviceToken);
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries && pendingTokens.length; attempt += 1) {
    try {
      const messaging = await getMessaging();
      const res = await messaging.sendMulticast({
        tokens: pendingTokens,
        ...(type === "ALERT" ? { notification: { title, body } } : {}),
        data: baseData,
      });

      const retryTokens = [];
      await Promise.all(res.responses.map(async (r, idx) => {
        if (r.success) return;
        const err = r.error;
        const code = err?.code || "";
        const token = pendingTokens[idx];

        if (code.includes("registration-token-not-registered") || code.includes("invalid-argument")) {
          await DeviceToken.deleteOne({ deviceToken: token });
          return;
        }

        if (code.includes("unavailable") || code.includes("internal")) {
          retryTokens.push(token);
          return;
        }
      }));

      pendingTokens = retryTokens;
    } catch (err) {
      console.error("FCM send error:", err.message || err);
      // fallback to in-app only
      break;
    }
  }

  return notification;
}
