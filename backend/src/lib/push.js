import User from "../models/User.js";
import { getMessaging } from "../config/firebaseAdmin.js";

export async function sendPushNotification(userId, title, body, url = "/") {
    try {
        const user = await User.findById(userId).select("fcmTokens");
        if (!user?.fcmTokens?.length) return;

        const tokens = Array.from(new Set(user.fcmTokens));
        const messaging = getMessaging();
        const result = await messaging.sendEachForMulticast({
            tokens,
            notification: { title, body },
            data: { url: String(url || "/") },
        });

        const invalidTokens = [];
        result.responses.forEach((response, idx) => {
            if (response.success) return;
            const code = response.error?.code || "";
            if (
                code.includes("registration-token-not-registered") ||
                code.includes("invalid-argument")
            ) {
                invalidTokens.push(tokens[idx]);
            }
        });

        if (invalidTokens.length) {
            await User.findByIdAndUpdate(userId, {
                $pull: { fcmTokens: { $in: invalidTokens } },
            });
        }
    } catch (error) {
        console.error("Push Error:", error);
    }
}
