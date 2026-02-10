import DeviceToken from "../../models/DeviceToken.js";

export default async function registerToken(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { deviceToken, platform } = req.body || {};
    const user = req.user;

    if (!deviceToken || !platform) {
      return res.status(400).json({ message: "deviceToken and platform are required" });
    }

    const recipientType = String(user.role || "user").toUpperCase();

    await DeviceToken.findOneAndUpdate(
      { recipientId: user._id, recipientType, deviceToken },
      { recipientId: user._id, recipientType, deviceToken, platform },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Register token error:", err);
    res.status(500).json({ message: "Failed to register device token" });
  }
}
