import Notification from "../../models/Notification.js";

export async function listNotifications(req, res) {
  try {
    const recipientType = String(req.user.role || "user").toUpperCase();
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null;
    const markReadId = req.query.markReadId;

    if (markReadId) {
      await Notification.updateOne(
        { _id: markReadId, recipientId: req.user._id, recipientType },
        { $set: { isRead: true } }
      );
    }

    const query = {
      recipientId: req.user._id,
      recipientType,
      ...(cursor ? { createdAt: { $lt: cursor } } : {}),
    };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const nextCursor = notifications.length
      ? notifications[notifications.length - 1].createdAt.toISOString()
      : null;

    res.json({ notifications, nextCursor });
  } catch (err) {
    console.error("List notifications error:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
}

export async function getNotification(req, res) {
  try {
    const recipientType = String(req.user.role || "user").toUpperCase();
    const { id } = req.params;
    const notification = await Notification.findOne({
      _id: id,
      recipientId: req.user._id,
      recipientType,
    });

    if (!notification) return res.status(404).json({ message: "Not found" });

    if (!notification.isRead) {
      notification.isRead = true;
      await notification.save();
    }

    res.json(notification);
  } catch (err) {
    console.error("Get notification error:", err);
    res.status(500).json({ message: "Failed to fetch notification" });
  }
}

export async function markRead(req, res) {
  try {
    const recipientType = String(req.user.role || "user").toUpperCase();
    const { id } = req.params;
    const updated = await Notification.findOneAndUpdate(
      { _id: id, recipientId: req.user._id, recipientType },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Not found" });

    res.json(updated);
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ message: "Failed to mark as read" });
  }
}
