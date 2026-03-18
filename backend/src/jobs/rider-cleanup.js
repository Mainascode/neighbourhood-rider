
import cron from "node-cron";
import Rider from "../models/Rider.js";

/**
 * Runs every 2 minutes.
 * Marks riders OFFLINE only after a long stale window.
 * This keeps riders reachable for push notifications even when app/socket is closed.
 * Sets them to OFFLINE
 */
export function startRiderCleanupJob() {
    // Run every 2 minutes
    // Cron syntax for every 2 minutes: "*/2 * * * *"
    cron.schedule("*/2 * * * *", async () => {
        console.log("⏱️ Running Rider Auto-Offline Cleanup Job...");
        try {
            const staleWindowMs = Number(process.env.RIDER_OFFLINE_STALE_MS || 24 * 60 * 60 * 1000);
            const staleCutoff = new Date(Date.now() - staleWindowMs);

                const result = await Rider.updateMany(
                    {
                        status: { $ne: "OFFLINE" },
                        lastSeen: { $lt: staleCutoff }
                    },
                    {
                        $set: { status: "OFFLINE", isAvailable: false, isOnline: false, socketId: null, lastOfflineReason: "STALE_PRESENCE" }
                    }
                );

            if (result.modifiedCount > 0) {
                console.log(`💤 Auto-Offline: Set ${result.modifiedCount} idle riders to OFFLINE.`);
            }
        } catch (err) {
            console.error("❌ Rider Cleanup Job Failed:", err);
        }
    });
}
