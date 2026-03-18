"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

const AuthContext = createContext(null);
const CartContext = createContext(null);
const NotificationsContext = createContext(null);

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        setValue(JSON.parse(raw));
      }
    } catch {}
  }, [key]);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue];
}

export function Providers({ children, initialUser = null }) {
  const [user, setUser] = useState(initialUser);
  const [cart, setCart] = usePersistentState("nr_cart", []);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState("default");
  const initializedNotifications = useRef(false);
  const seenNotificationIds = useRef(new Set());

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(window.Notification.permission);
    }
  }, []);

  useEffect(() => {
    let interval = null;

    async function refreshNotifications() {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);

      const nextIds = new Set((data.notifications || []).map((item) => item.id));
      const newUnread = (data.notifications || []).filter(
        (item) => !item.readAt && !seenNotificationIds.current.has(item.id),
      );

      if (
        initializedNotifications.current &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        window.Notification.permission === "granted"
      ) {
        newUnread.slice(0, 3).forEach((item) => {
          window.setTimeout(() => {
            new window.Notification(item.title, {
              body: item.message,
            });
          }, 0);
        });
      }

      seenNotificationIds.current = nextIds;
      initializedNotifications.current = true;
    }

    if (user) {
      refreshNotifications();
      interval = window.setInterval(refreshNotifications, 15000);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      initializedNotifications.current = false;
      seenNotificationIds.current = new Set();
    }

    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [user]);

  async function markNotificationsRead(ids) {
    if (!ids?.length) {
      return;
    }

    const response = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      return;
    }

    setNotifications((current) =>
      current.map((item) => (ids.includes(item.id) ? { ...item, readAt: new Date().toISOString() } : item)),
    );
    setUnreadCount((current) => Math.max(0, current - ids.length));
  }

  async function requestNotificationPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }

    const result = await window.Notification.requestPermission();
    setPermission(result);
    return result;
  }

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <CartContext.Provider value={{ cart, setCart }}>
        <NotificationsContext.Provider
          value={{
            notifications,
            unreadCount,
            permission,
            markNotificationsRead,
            requestNotificationPermission,
          }}
        >
          {children}
        </NotificationsContext.Provider>
      </CartContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useCart() {
  return useContext(CartContext);
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
