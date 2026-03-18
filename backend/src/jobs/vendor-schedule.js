
import cron from "node-cron";

/**
 * Starts the vendor schedule jobs.
 * Broadcasts system status updates to connected clients.
 * @param {Object} io - Socket.io instance
 */
export function startVendorScheduleJobs(io) {
    if (!io) {
        console.warn("Socket.IO not provided to vendor schedule jobs.");
        return;
    }

    // Open Shops at 06:00
    cron.schedule("0 6 * * *", () => {
        console.log("⏰ System: Opening Shops (06:00)");
        io.emit("system:status", {
            isOpen: true,
            message: "Shops are now OPEN! 🌅"
        });
    });

    // Close Shops at 21:00
    cron.schedule("0 21 * * *", () => {
        console.log("⏰ System: Closing Shops (21:00)");
        io.emit("system:status", {
            isOpen: false,
            message: "Shops are now CLOSED. See you at 6:00 AM! 🌙"
        });
    });

    console.log("✅ Vendor Schedule Jobs (06:00/21:00) initialized.");
}
