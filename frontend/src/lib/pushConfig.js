import { API_URL } from "./config";
import { auth } from "../firebase";

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

class PushSetupError extends Error {
    constructor(message, code) {
        super(message);
        this.name = "PushSetupError";
        this.code = code;
    }
}

class PushAuthError extends Error {
    constructor(message, code) {
        super(message);
        this.name = "PushAuthError";
        this.code = code;
    }
}

async function getVapidPublicKey() {
    if (isValidVapidPublicKey(PUBLIC_VAPID_KEY)) return PUBLIC_VAPID_KEY;

    const res = await fetch(`${API_URL}/api/notifications/vapid-public-key`, {
        credentials: "include",
    });
    if (!res.ok) {
        let serverMessage = "";
        try {
            const data = await res.json();
            serverMessage = data?.error || data?.message || "";
        } catch {
            serverMessage = "";
        }

        if (res.status === 500 && /not configured/i.test(serverMessage)) {
            throw new PushSetupError(
                "Push not configured on server: set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
                "PUSH_NOT_CONFIGURED"
            );
        }

        throw new PushSetupError(
            `Failed to fetch public VAPID key from server (status ${res.status}${serverMessage ? `: ${serverMessage}` : ""}).`,
            "PUSH_KEY_FETCH_FAILED"
        );
    }
    const data = await res.json();
    const serverKey = normalizeVapidKey(data?.publicKey);
    if (!isValidVapidPublicKey(serverKey)) {
        throw new PushSetupError(
            `Push not configured: frontend/server VAPID key invalid (${getVapidDiagnostics(serverKey)}).`
            , "PUSH_INVALID_KEY"
        );
    }
    return serverKey;
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
    const vapidKey = await getVapidPublicKey();

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

    const serverKeyBytes = urlBase64ToUint8Array(vapidKey);
    let subscription = await registration.pushManager.getSubscription();

    // If an old subscription exists with a different VAPID key, recreate it.
    if (subscription) {
        try {
            const currentKeyBuffer = subscription.options?.applicationServerKey;
            const currentKeyBytes = currentKeyBuffer ? new Uint8Array(currentKeyBuffer) : null;
            const sameKey =
                currentKeyBytes &&
                currentKeyBytes.length === serverKeyBytes.length &&
                currentKeyBytes.every((b, i) => b === serverKeyBytes[i]);

            if (!sameKey) {
                await subscription.unsubscribe();
                subscription = null;
            }
        } catch {
            await subscription.unsubscribe();
            subscription = null;
        }
    }

    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: serverKeyBytes,
        });
    }

    // Send to backend
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`${API_URL}/api/notifications/subscribe`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify(subscription),
        headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
    });

    if (!res.ok) {
        if (res.status === 401) {
            throw new PushAuthError("Unauthorized push subscription request.", "PUSH_UNAUTHORIZED");
        }
        throw new PushAuthError(`Push subscription request failed (${res.status}).`, "PUSH_SUBSCRIBE_FAILED");
    }

    console.log("Push Notification Subscribed!");
}
