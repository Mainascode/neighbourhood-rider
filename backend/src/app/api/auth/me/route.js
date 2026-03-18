import connectDB from "../../../../lib/db.js";
import Notification from "../../../../models/Notification.js";
import { getUserFromRequest } from "../../../../lib/api-auth.js";
import { fail, ok } from "../../../../lib/response.js";

export async function GET() {
  const user = await getUserFromRequest();

  if (!user) {
    return fail("Unauthorized.", 401);
  }

  await connectDB();
  const recipientType = String(user.role || "user").toUpperCase() === "ADMIN" ? "ADMIN" : "USER";
  const notifications = await Notification.find({
    recipientId: user.id,
    recipientType,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return ok({
    user,
    notifications: notifications.map((notification) => ({
      id: notification._id.toString(),
      type: notification.eventType || notification.type,
      title: notification.title,
      message: notification.body,
      actionUrl: notification.deepLink || "",
      orderId: notification.orderId || "",
      orderLabel: notification.orderId ? `#${String(notification.orderId).slice(-6)}` : "",
      senderName: "System",
      senderRole: "system",
      readAt: notification.isRead ? notification.updatedAt || notification.createdAt : null,
      createdAt: notification.createdAt,
      createdAtLabel: new Intl.DateTimeFormat("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Nairobi",
      }).format(notification.createdAt),
    })),
    unreadCount: notifications.filter((item) => !item.isRead).length,
  });
}

export async function PATCH(request) {
  const user = await getUserFromRequest();

  if (!user) {
    return fail("Unauthorized.", 401);
  }

  const body = await request.json();
  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];

  if (!ids.length) {
    return fail("Notification ids are required.");
  }

  await connectDB();
  const recipientType = String(user.role || "user").toUpperCase() === "ADMIN" ? "ADMIN" : "USER";
  await Notification.updateMany(
    {
      _id: { $in: ids },
      recipientId: user.id,
      recipientType,
      isRead: false,
    },
    { $set: { isRead: true } },
  );

  return ok({ message: "Notifications marked as read." });
}
