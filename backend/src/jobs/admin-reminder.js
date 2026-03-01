import cron from "node-cron";
import User from "../models/User.js";
import { sendNotification } from "../lib/notificationService.js";
import { redisAcquireLock } from "../lib/redis.js";

export function startAdminPayoutReminderJob(io) {
  const timezone = process.env.ADMIN_REMINDER_TIMEZONE || "Africa/Nairobi";
  cron.schedule("0 21 * * *", async () => {
    try {
      const dateKey = new Date().toISOString().slice(0, 10);
      const lockAcquired = await redisAcquireLock(`lock:cron:payout-reminder:${dateKey}`, 60 * 60);
      if (!lockAcquired) return;

      const admins = await User.find({ role: "admin" }).select("_id");
      if (!admins.length) return;

      await Promise.all(admins.map(async (admin) => {
        await sendNotification({
          recipientId: admin._id,
          recipientType: "ADMIN",
          title: "Daily Payout Reminder",
          body: "It is 9:00 PM. Run rider batch payouts.",
          data: { action: "RUN_RIDER_PAYOUTS" },
          eventType: "ADMIN_PAYOUT_REMINDER",
          deepLink: "/admin/dashboard",
          type: "ALERT",
          category: "systemAlerts",
          io,
        });
      }));

      if (io) {
        io.emit("admin:reminder", {
          title: "Daily Payout Reminder",
          body: "It is 9:00 PM. Run rider batch payouts.",
          action: "RUN_RIDER_PAYOUTS",
          at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Admin payout reminder job failed:", err);
    }
  }, { timezone });
}
