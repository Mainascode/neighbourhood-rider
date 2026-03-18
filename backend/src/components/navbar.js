"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useCart, useNotifications } from "../app/providers.js";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { cart } = useCart();
  const { notifications, unreadCount, permission, markNotificationsRead, requestNotificationPermission } = useNotifications();
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  async function openNotification(notification) {
    if (!notification.readAt) {
      await markNotificationsRead([notification.id]);
    }

    setIsInboxOpen(false);
    router.push(notification.actionUrl || (user?.role === "admin" ? "/admin" : "/orders"));
  }

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Neighbourhood Rider
        </Link>
        <nav className="flex items-center gap-3 text-sm text-slate-300">
          <Link className={pathname === "/shop" ? "text-white" : ""} href="/shop">
            Shop
          </Link>
          <Link className={pathname === "/orders" ? "text-white" : ""} href="/orders">
            Orders
          </Link>
          {user?.role === "admin" && (
            <Link className={pathname === "/admin" ? "text-white" : ""} href="/admin">
              Admin
            </Link>
          )}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsInboxOpen((current) => !current)}
                className="rounded-full border border-white/15 px-4 py-2 text-white"
              >
                Alerts {unreadCount ? `(${unreadCount})` : ""}
              </button>
              {isInboxOpen ? (
                <div className="absolute right-0 top-12 z-40 w-[22rem] rounded-[1.5rem] border border-white/10 bg-slate-950 p-3 shadow-2xl shadow-black/40">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-white">Notifications</p>
                    {permission !== "granted" ? (
                      <button
                        type="button"
                        onClick={requestNotificationPermission}
                        className="text-xs text-amber-300"
                      >
                        Enable browser alerts
                      </button>
                    ) : null}
                  </div>
                  <div className="grid max-h-96 gap-2 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                        No notifications yet.
                      </div>
                    ) : null}
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => openNotification(notification)}
                        className={`rounded-2xl border px-4 py-3 text-left ${
                          notification.readAt
                            ? "border-white/10 bg-white/5 text-slate-300"
                            : "border-amber-400/30 bg-amber-400/10 text-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-300">{notification.message}</p>
                          </div>
                          {!notification.readAt ? (
                            <span className="mt-1 size-2 rounded-full bg-amber-300" />
                          ) : null}
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                          {notification.createdAtLabel}
                          {notification.orderLabel ? ` • ${notification.orderLabel}` : ""}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-200">
            Cart {cartCount}
          </span>
          {user ? (
            <>
              <span className="hidden sm:inline">{user.name}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-white/15 px-4 py-2 text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/auth" className="rounded-full bg-emerald-400 px-4 py-2 font-medium text-slate-950">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
