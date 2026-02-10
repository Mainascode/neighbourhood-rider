import Rider from "../../models/Rider.js";

/**
 * POST /api/riders/go-online
 * Body: { location: { lat, lng } }
 */
export async function goOnline(req, res) {
    try {
        const { location } = req.body;

        if (!location || !location.lat || !location.lng) {
            return res.status(400).json({ error: "Location (lat, lng) is required" });
        }

        const existing = await Rider.findOne({ userId: req.user._id });
        if (!existing) {
            return res.status(404).json({ error: "Rider profile not found" });
        }
        if (existing.penalties?.isDisabled) {
            return res.status(403).json({ error: "Rider account disabled due to penalties" });
        }

        const rider = await Rider.findOneAndUpdate(
            { userId: req.user._id },
            {
                status: "ONLINE_AVAILABLE",
                location: {
                    type: "Point",
                    coordinates: [location.lng, location.lat], // GeoJSON order: [lng, lat]
                },
                lastSeen: new Date(),
            },
            { new: true }
        );

        if (!rider) {
            return res.status(404).json({ error: "Rider profile not found" });
        }

        res.json({ message: "You are now ONLINE", rider });
    } catch (err) {
        console.error("Error going online:", err);
        res.status(500).json({ error: "Failed to go online" });
    }
}

/**
 * POST /api/riders/go-offline
 */
export async function goOffline(req, res) {
    try {
        const rider = await Rider.findOneAndUpdate(
            { userId: req.user._id },
            { status: "OFFLINE" },
            { new: true }
        );

        if (!rider) {
            return res.status(404).json({ error: "Rider profile not found" });
        }

        res.json({ message: "You are now OFFLINE", rider });
    } catch (err) {
        console.error("Error going offline:", err);
        res.status(500).json({ error: "Failed to go offline" });
    }
}

/**
 * POST /api/riders/heartbeat
 * Body: { location: { lat, lng } }
 */
export async function heartbeat(req, res) {
    try {
        const { location } = req.body;

        if (!location || !location.lat || !location.lng) {
            return res.status(400).json({ error: "Location (lat, lng) is required" });
        }

        // Only update if NOT offline
        const existing = await Rider.findOne({ userId: req.user._id });
        if (existing?.penalties?.isDisabled) {
            return res.status(403).json({ error: "Rider account disabled due to penalties" });
        }

        const rider = await Rider.findOneAndUpdate(
            {
                userId: req.user._id,
                status: { $ne: "OFFLINE" }
            },
            {
                location: {
                    type: "Point",
                    coordinates: [location.lng, location.lat],
                },
                lastSeen: new Date(),
            },
            { new: true }
        );

        if (!rider) {
            // Check if rider exists but is offline
            const offlineRider = await Rider.findOne({ userId: req.user._id });
            if (offlineRider && offlineRider.status === "OFFLINE") {
                return res.status(400).json({ error: "Rider is OFFLINE. Go online first." });
            }
            return res.status(404).json({ error: "Rider profile not found" });
        }

        res.json({ message: "Heartbeat received", lastSeen: rider.lastSeen });
    } catch (err) {
        console.error("Error sending heartbeat:", err);
        res.status(500).json({ error: "Failed to process heartbeat" });
    }
}
