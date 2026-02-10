import { createContext, useContext, useState, useEffect } from "react";
import { socket } from "../lib/socket";

const NotificationContext = createContext(undefined);

export const useNotify = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotify must be used inside NotificationProvider");
  }
  return ctx;
};

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null);

  /* Push Notifications */
  const enableNotifications = async () => {
    try {
      const { registerServiceWorker, subscribeToPush } = await import("../lib/pushConfig");
      await registerServiceWorker();
      await subscribeToPush();
      notify("Notifications enabled! 🔔", "success");
    } catch (e) {
      console.error(e);
      notify("Failed to enable notifications.", "error");
    }
  };

  const notify = (message, type = "info", timeout = 3000) => {
    setNotification({ message, type });

    setTimeout(() => {
      setNotification(null);
    }, timeout);
  };

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
  }, []);

  return (
    <NotificationContext.Provider value={{ notify, enableNotifications }}>
      {children}

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
