"use client";

import { useEffect, useState } from "react";
import { useNotifications } from "../app/providers.js";

const EMPTY_PRODUCT = {
  id: "",
  name: "",
  slug: "",
  category: "",
  description: "",
  price: "",
  unit: "",
  image: "/globe.svg",
};

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

export default function AdminPage({ initialOverview }) {
  const [overview, setOverview] = useState(initialOverview);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [message, setMessage] = useState("");
  const { notifications } = useNotifications();

  async function refreshOverview() {
    const response = await fetch("/api/admin/overview");
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setOverview(data);
  }

  useEffect(() => {
    const interval = window.setInterval(refreshOverview, 15000);
    return () => window.clearInterval(interval);
  }, []);

  async function updateWeather(weather) {
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weather, isRaining: weather === "rainy" }),
    });
    const data = await response.json();
    setMessage(data.message || "");
    refreshOverview();
  }

  async function createProduct(event) {
    event.preventDefault();
    const isEditing = Boolean(productForm.id);
    const response = await fetch(isEditing ? `/api/products/${productForm.id}` : "/api/products", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...productForm,
        price: Number(productForm.price),
      }),
    });
    const data = await response.json();
    setMessage(data.message || "");
    if (response.ok) {
      setProductForm(EMPTY_PRODUCT);
      refreshOverview();
    }
  }

  async function updateOrderStatus(orderId, status) {
    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    setMessage(data.message || "");
    refreshOverview();
  }

  async function deleteProduct(id) {
    const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const data = await response.json();
    setMessage(data.message || "");
    refreshOverview();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <section className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Admin dashboard</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">Control weather, products, paid orders, and deliveries.</h1>
        </div>
        <div className="flex gap-2 rounded-full bg-slate-900 p-1">
          {["sunny", "rainy"].map((weather) => (
            <button
              key={weather}
              type="button"
              onClick={() => updateWeather(weather)}
              className={`rounded-full px-5 py-3 text-sm capitalize ${
                overview.settings.weather === weather ? "bg-amber-400 text-slate-950" : "text-slate-300"
              }`}
            >
              {weather === "rainy" ? "Rainy" : "Sunny"}
            </button>
          ))}
        </div>
      </section>

      {message ? <p className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        <MetricCard label="Orders" value={overview.metrics.orders} />
        <MetricCard label="Paid payments" value={overview.metrics.paidPayments} />
        <MetricCard label="Ratings" value={overview.metrics.ratings} />
        <MetricCard label="Revenue" value={`KES ${overview.metrics.revenue}`} />
      </section>

      <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-semibold text-white">Recent notifications</h2>
        <div className="mt-5 grid gap-3">
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
              No notifications yet.
            </div>
          ) : null}
          {notifications.slice(0, 6).map((notification) => (
            <div key={notification.id} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm">
              <p className="font-medium text-white">{notification.title}</p>
              <p className="mt-1 text-slate-300">{notification.message}</p>
              <p className="mt-2 text-slate-500">
                {notification.createdAtLabel}
                {notification.orderLabel ? ` • ${notification.orderLabel}` : ""}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold text-white">Add product</h2>
          <form onSubmit={createProduct} className="mt-5 grid gap-3">
            {Object.keys(EMPTY_PRODUCT).map((field) => (
              field === "id" ? null :
              field === "description" ? (
                <textarea
                  key={field}
                  className="input min-h-24"
                  placeholder={field}
                  value={productForm[field]}
                  onChange={(e) => setProductForm((current) => ({ ...current, [field]: e.target.value }))}
                  required={field !== "image"}
                />
              ) : (
                <input
                  key={field}
                  className="input"
                  placeholder={field}
                  value={productForm[field]}
                  onChange={(e) => setProductForm((current) => ({ ...current, [field]: e.target.value }))}
                  required={field !== "image"}
                />
              )
            ))}
            <div className="flex gap-3">
              <button type="submit" className="rounded-full bg-emerald-400 px-5 py-3 font-semibold text-slate-950">
                {productForm.id ? "Update product" : "Save product"}
              </button>
              {productForm.id ? (
                <button type="button" onClick={() => setProductForm(EMPTY_PRODUCT)} className="rounded-full border border-white/15 px-5 py-3 text-white">
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-8 grid gap-3">
            {overview.products.map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3">
                <div>
                  <p className="font-medium text-white">{product.name}</p>
                  <p className="text-sm text-slate-400">KES {product.price} • {product.category}</p>
                </div>
                <div className="flex gap-4 text-sm">
                  <button
                    type="button"
                    onClick={() =>
                      setProductForm({
                        id: product.id,
                        name: product.name,
                        slug: product.slug,
                        category: product.category,
                        description: product.description,
                        price: String(product.price),
                        unit: product.unit,
                        image: product.image,
                      })
                    }
                    className="text-amber-300"
                  >
                    Edit
                  </button>
                  <button type="button" onClick={() => deleteProduct(product.id)} className="text-rose-300">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold text-white">Paid and active orders</h2>
            <div className="mt-5 grid gap-4">
              {overview.orders.map((order) => (
                <article key={order.id} className="rounded-3xl border border-white/10 bg-slate-900/80 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm text-slate-400">{order.customerName} • {order.customerPhone}</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">KES {order.totalPrice}</h3>
                      <p className="mt-1 text-sm text-slate-300">{order.area} • {order.address}</p>
                      <p className="mt-1 text-sm text-slate-300">
                        Payment {order.paymentStatus} • {formatStatus(order.status)} • Delivery fee KES {order.deliveryFee}
                      </p>
                      <div className="mt-2 grid gap-1 text-sm text-slate-400">
                        {order.items?.map((item) => (
                          <span key={`${order.id}-${item.name}`}>{item.name} x {item.quantity} • KES {item.subtotal}</span>
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-400">
                        <span>{order.createdAtLabel}</span>
                        <a className="text-amber-300" href={`/api/orders/${order.id}/receipt`} target="_blank">
                          Admin receipt copy
                        </a>
                      </div>
                    </div>
                    <select className="input max-w-52" value={normalizeStatus(order.status)} onChange={(e) => updateOrderStatus(order.id, e.target.value)}>
                      <option value="paid">Paid</option>
                      <option value="processing">Processing</option>
                      <option value="on_the_way">On the way</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-semibold text-white">Payments</h2>
              <div className="mt-5 grid gap-3">
                {overview.payments.map((payment) => (
                  <div key={payment.id} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm">
                    <p className="font-medium text-white">KES {payment.amount}</p>
                    <p className="text-slate-400">{payment.status} • {payment.phone}</p>
                    <p className="text-slate-500">
                      {payment.receiptNumber || "Awaiting receipt"} • {payment.createdAtLabel}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-semibold text-white">Ratings</h2>
              <div className="mt-5 grid gap-3">
                {overview.ratings.map((rating) => (
                  <div key={rating.id} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm">
                    <p className="font-medium text-white">{rating.rating}/5 stars</p>
                    <p className="text-slate-400">{rating.userName} • {rating.customerName}</p>
                    <p className="text-slate-400">{rating.feedback || "No feedback provided"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
