import { API_URL } from "./config";

// This MUST match the Public Key generated on the backend
// User needs to fill this in after I provide it
const PUBLIC_VAPID_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY || "PLACEHOLDER_KEY";

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        try {
            const registration = await navigator.serviceWorker.register("/service-worker.js");
            console.log("Service Worker registered with scope:", registration.scope);
            return registration;
        } catch (error) {
            console.error("Service Worker registration failed:", error);
        }
    }
    return null;
}

export async function subscribeToPush() {
    if (!("serviceWorker" in navigator)) return;

    const registration = await navigator.serviceWorker.ready;

    // Check if push is supported
    if (!registration.pushManager) {
        console.log("Push manager not supported");
        return;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        console.error("Permission not granted for Notification");
        return;
    }

    // Subscribe
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
    });

    // Send to backend
    await fetch(`${API_URL}/api/notifications/subscribe`, {
        method: "POST",
        body: JSON.stringify(subscription),
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}` // Assuming token is here
        },
    });

    console.log("Push Notification Subscribed!");
}
