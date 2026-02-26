import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { socket } from "../lib/socket";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(undefined);

export const useNotify = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotify must be used inside NotificationProvider");
  }
  return ctx;
};

export function NotificationProvider({ children }) {
  const { user, loading } = useAuth();
  const [notification, setNotification] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  /* Push Notifications */
  const notify = useCallback((message, type = "info", timeout = 3000) => {
    setNotification({ message, type });

    setTimeout(() => {
      setNotification(null);
    }, timeout);
  }, []);

  const enableNotifications = useCallback(async (options = { prompt: true }) => {
    try {
      const { registerServiceWorker, subscribeToPush } = await import("../lib/pushConfig");
      await registerServiceWorker();
      await subscribeToPush(options);
      if (Notification.permission === "granted") {
        notify("Notifications enabled! 🔔", "success");
        setPermissionDenied(false);
      } else if (Notification.permission === "denied") {
        setPermissionDenied(true);
      }
    } catch (e) {
      console.error(e);
      if (e?.code === "PUSH_NOT_CONFIGURED") {
        console.warn("Push notifications are disabled until VAPID keys are configured on backend.");
        return;
      }
      if (e?.code === "PUSH_UNAUTHORIZED") {
        return;
      }
      notify("Failed to enable notifications.", "error");
    }
  }, [notify]);

  useEffect(() => {
    const handleNotification = (payload) => {
      if (!payload) return;
      if (payload.type === "SILENT") return;
      const title = payload.title || "Notification";
      const body = payload.body || "";
      notify(`${title}${body ? `: ${body}` : ""}`, "info");
    };

    socket.on("notification:new", handleNotification);
    return () => {
      socket.off("notification:new", handleNotification);
    };
  }, [notify]);

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (loading || !user) return;
    if (Notification.permission === "granted") {
      enableNotifications({ prompt: false });
    } else if (Notification.permission === "denied") {
      setPermissionDenied(true);
    }
  }, [enableNotifications, loading, user]);

  const SettingsLink = () => (
    <a
      href="https://support.google.com/chrome/answer/3220216"
      target="_blank"
      rel="noreferrer"
      className="underline font-semibold"
    >
      Browser settings
    </a>
  );

  return (
    <NotificationContext.Provider value={{ notify, enableNotifications }}>
      {children}

      {permissionDenied && (
        <div className="fixed bottom-20 right-6 z-50 max-w-sm bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl shadow-xl p-4 text-sm">
          <div className="font-bold mb-1">Notifications are blocked</div>
          <p className="text-yellow-800">
            Enable notifications in your browser settings to receive updates.
          </p>
          <div className="mt-2">
            <SettingsLink />
          </div>
        </div>
      )}

      {/* Notification UI */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-riderLight font-semibold transition-all
            ${notification.type === "success"
              ? "bg-green-600"
              : notification.type === "error"
                ? "bg-red-600"
                : "bg-blue-600"
            }
          `}
        >
          {notification.message}
        </div>
      )}
    </NotificationContext.Provider>
  );
}
