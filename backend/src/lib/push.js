import webpush from "web-push";
import Subscription from "../models/Subscription.js";

const vapidPublicKey = (process.env.VAPID_PUBLIC_KEY || process.env.REACT_APP_VAPID_PUBLIC_KEY || "").trim();
const vapidPrivateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@neighborhoodrider.com";

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        vapidSubject,
        vapidPublicKey,
        vapidPrivateKey
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
