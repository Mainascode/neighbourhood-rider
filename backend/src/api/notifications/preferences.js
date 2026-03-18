import NotificationPreference from "../../models/NotificationPreference.js";

export async function getPreferences(req, res) {
  try {
    const recipientType = String(req.user.role || "user").toUpperCase();
    const prefs = await NotificationPreference.findOne({
      recipientId: req.user._id,
      recipientType,
    });

    if (!prefs) {
      return res.json({
        orderUpdates: true,
        promotions: true,
        systemAlerts: true,
      });
    }

    res.json({
      orderUpdates: prefs.orderUpdates,
      promotions: prefs.promotions,
      systemAlerts: prefs.systemAlerts,
    });
  } catch (err) {
    console.error("Get prefs error:", err);
    res.status(500).json({ message: "Failed to fetch preferences" });
  }
}

export async function updatePreferences(req, res) {
  try {
    const recipientType = String(req.user.role || "user").toUpperCase();
    const { orderUpdates, promotions, systemAlerts } = req.body || {};

    const prefs = await NotificationPreference.findOneAndUpdate(
      { recipientId: req.user._id, recipientType },
      {
        recipientId: req.user._id,
        recipientType,
        ...(typeof orderUpdates === "boolean" ? { orderUpdates } : {}),
        ...(typeof promotions === "boolean" ? { promotions } : {}),
        ...(typeof systemAlerts === "boolean" ? { systemAlerts } : {}),
      },
      { upsert: true, new: true }
    );

    res.json({
      orderUpdates: prefs.orderUpdates,
      promotions: prefs.promotions,
      systemAlerts: prefs.systemAlerts,
    });
  } catch (err) {
    console.error("Update prefs error:", err);
    res.status(500).json({ message: "Failed to update preferences" });
  }
}
