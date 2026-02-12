
import cron from "node-cron";
import Rider from "../models/Rider.js";

/**
 * Runs every 120 seconds (2 minutes)
 * Checks for riders with status != OFFLINE
 * and lastSeen < (now - 120s)
 * Sets them to OFFLINE
 */
export function startRiderCleanupJob() {
    // Run every 2 minutes
    // Cron syntax for every 2 minutes: "*/2 * * * *"
    cron.schedule("*/2 * * * *", async () => {
        console.log("⏱️ Running Rider Auto-Offline Cleanup Job...");
        try {
            const twoMinutesAgo = new Date(Date.now() - 120 * 1000);

                const result = await Rider.updateMany(
                    {
                        status: { $ne: "OFFLINE" },
                        lastSeen: { $lt: twoMinutesAgo }
                    },
                    {
                        $set: { status: "OFFLINE", isAvailable: false }
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
