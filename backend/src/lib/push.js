import webpush from "web-push";
import Subscription from "../models/Subscription.js";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        "mailto:support@neighborhoodrider.com",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

export async function sendPushNotification(userId, title, body, url = "/") {
    try {
        const subscriptions = await Subscription.find({ userId });
        if (!subscriptions.length) return;

        const payload = JSON.stringify({ title, body, url });

        const promises = subscriptions.map((sub) =>
            webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys },
                payload
            ).catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    Subscription.deleteOne({ _id: sub._id }).exec();
                }
            })
        );

        await Promise.all(promises);
    } catch (error) {
        console.error("Push Error:", error);
    }
}
