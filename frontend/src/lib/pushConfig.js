import { API_URL } from "./config";

function normalizeVapidKey(key) {
    return (key || "")
        .trim()
        .replace(/^['"]|['"]$/g, "")
        .replace(/\s+/g, "");
}

// This MUST match the public VAPID key configured in backend env.
const PUBLIC_VAPID_KEY = normalizeVapidKey(process.env.REACT_APP_VAPID_PUBLIC_KEY);

function isValidVapidPublicKey(key) {
    if (!key || key === "PLACEHOLDER_KEY") return false;
    if (!/^[A-Za-z0-9\-_]{70,200}$/.test(key)) return false;
    try {
        const bytes = urlBase64ToUint8Array(key);
        // Uncompressed P-256 public key should be 65 bytes and start with 0x04.
        return bytes.length === 65 && bytes[0] === 4;
    } catch {
        return false;
    }
}

function getVapidDiagnostics(key) {
    const safePrefix = key ? key.slice(0, 8) : "<empty>";
    return `len=${key.length}, prefix=${safePrefix}`;
}

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
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

export async function subscribeToPush(options = { prompt: true }) {
    if (!("serviceWorker" in navigator)) return;
    if (!isValidVapidPublicKey(PUBLIC_VAPID_KEY)) {
        throw new Error(
            `Push not configured: REACT_APP_VAPID_PUBLIC_KEY is missing/invalid (${getVapidDiagnostics(PUBLIC_VAPID_KEY)}).`
        );
    }

    const registration = await navigator.serviceWorker.ready;

    // Check if push is supported
    if (!registration.pushManager) {
        console.log("Push manager not supported");
        return;
    }

    // Request permission
    let permission = Notification.permission;
    if (permission === "default" && options.prompt) {
        permission = await Notification.requestPermission();
    }
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
