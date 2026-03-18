"use client";

import { useEffect, useState } from "react";
import { useNotifications } from "../app/providers.js";

const STAGES = ["pending", "purchased", "on_delivery", "delivered"];
const STATUS_STAGES = ["paid", "processing", "on_the_way", "delivered"];

function normalizeStatus(status) {
  if (status === "purchased") {
    return "processing";
  }

  if (status === "on_delivery") {
    return "on_the_way";
  }

  if (status === "pending") {
    return "paid";
  }

  return status;
}

function formatStatus(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "on_the_way") {
    return "On the way";
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).replaceAll("_", " ");
}

export default function OrdersPage({ initialOrders, highlight = "" }) {
  const [orders, setOrders] = useState(initialOrders);
  const [message, setMessage] = useState("");
  const { notifications } = useNotifications();

  useEffect(() => {
    async function refreshOrders() {
      const response = await fetch("/api/orders");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setOrders(data.orders);
    }

    refreshOrders();
    const interval = window.setInterval(refreshOrders, 15000);
    return () => window.clearInterval(interval);
  }, []);

  async function submitRating(orderId, rating, feedback) {
    const response = await fetch(`/api/orders/${orderId}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, feedback }),
    });

    const data = await response.json();
    setMessage(data.message || "");

    if (response.ok) {
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? { ...order, ratingSubmitted: true } : order)),
      );
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <section className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Tracking</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">Your deliveries</h1>
        </div>
      </section>

      {message ? <p className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}

      <div className="grid gap-6">
        {orders.map((order) => (
          <article
            key={order.id}
            className={`rounded-[2rem] border p-6 ${highlight === order.id ? "border-amber-300 bg-amber-400/5" : "border-white/10 bg-white/5"}`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm text-slate-400">Order #{order.id.slice(-6)} • {order.createdAtLabel}</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">KES {order.totalPrice}</h2>
                <p className="mt-2 text-slate-300">{order.area} • {order.address}</p>
                <div className="mt-4 grid gap-2 text-sm text-slate-300">
                  <span>Payment: <strong className="text-white capitalize">{order.paymentStatus}</strong></span>
                  <span>Delivery fee: <strong className="text-white">KES {order.deliveryFee}</strong></span>
                  <span>Status: <strong className="text-white">{formatStatus(order.status)}</strong></span>
                  <span>Receipt: <a className="text-amber-300" href={`/api/orders/${order.id}/receipt`} target="_blank">View</a></span>
                </div>
              </div>
              <div className="grid gap-3 lg:min-w-80">
                {STATUS_STAGES.map((stage) => (
                  <div key={stage} className={`rounded-2xl border px-4 py-3 text-sm ${STATUS_STAGES.indexOf(normalizeStatus(order.status)) >= STATUS_STAGES.indexOf(stage) ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-white/10 text-slate-400"}`}>
                    {formatStatus(stage)}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-2 text-sm text-slate-300">
              {order.items.map((item) => (
                <div key={item.productId} className="flex justify-between">
                  <span>{item.name} x {item.quantity}</span>
                  <span>KES {item.subtotal}</span>
                </div>
              ))}
            </div>

            <OrderNotifications
              notifications={notifications.filter((notification) => notification.orderId === order.id)}
            />

            {order.status === "delivered" && !order.ratingSubmitted ? (
              <RatingForm orderId={order.id} onSubmit={submitRating} />
            ) : null}
          </article>
        ))}

        {orders.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/5 p-8 text-slate-300">
            No orders yet. Place your first order from the shop.
          </div>
        ) : null}
      </div>
    </main>
  );
}

function OrderNotifications({ notifications }) {
  if (!notifications.length) {
    return null;
  }

  return (
    <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
      <p className="text-sm font-medium text-white">Recent order updates</p>
      <div className="mt-3 grid gap-2">
        {notifications.slice(0, 3).map((notification) => (
          <div key={notification.id} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300">
            <p className="font-medium text-white">{notification.title}</p>
            <p className="mt-1">{notification.message}</p>
            <p className="mt-2 text-xs text-slate-500">{notification.createdAtLabel}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RatingForm({ orderId, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(orderId, rating, feedback);
      }}
      className="mt-6 grid gap-3 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4"
    >
      <label className="text-sm text-slate-300">Rate this delivery</label>
      <select className="input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
        {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
      </select>
      <textarea className="input min-h-24" placeholder="Optional feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      <button type="submit" className="rounded-full bg-amber-400 px-5 py-3 font-semibold text-slate-950">
        Submit rating
      </button>
    </form>
  );
}
