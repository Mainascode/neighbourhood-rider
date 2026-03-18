import DeviceToken from "../../models/DeviceToken.js";
import User from "../../models/User.js";

export default async function registerToken(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { fcmToken } = req.body || {};
    const user = req.user;

    if (!fcmToken) {
      return res.status(400).json({ message: "fcmToken is required" });
    }

    const recipientType = String(user.role || "user").toUpperCase();

    await User.findByIdAndUpdate(
      user._id,
      { $addToSet: { fcmTokens: fcmToken } },
      { new: true }
    );

    await DeviceToken.findOneAndUpdate(
      { recipientId: user._id, recipientType, deviceToken: fcmToken },
      { recipientId: user._id, recipientType, deviceToken: fcmToken, platform: "web" },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Register token error:", err);
    res.status(500).json({ message: "Failed to register device token" });
  }
}
