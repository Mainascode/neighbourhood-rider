import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "./firebase";

let messagingInstance = null;

function getMessagingSafe() {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
}

export async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const messaging = getMessagingSafe();
  if (!messaging) return null;

  const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    throw new Error("Missing REACT_APP_FIREBASE_VAPID_KEY");
  }

  const token = await getToken(messaging, { vapidKey });
  return token || null;
}

export function onMessageListener() {
  return new Promise((resolve) => {
    const messaging = getMessagingSafe();
    if (!messaging) {
      resolve(null);
      return;
    }
    onMessage(messaging, (payload) => resolve(payload));
  });
}

