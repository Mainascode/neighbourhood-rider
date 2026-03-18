"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SERVICE_AREAS } from "../lib/constants.js";
import { useAuth, useCart } from "../app/providers.js";

export default function ShopPage({ initialProducts, initialWeather, deliveryPreview }) {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { cart, setCart } = useCart();
  const [products, setProducts] = useState(initialProducts);
  const [weather, setWeather] = useState(initialWeather);
  const [deliveryFee, setDeliveryFee] = useState(deliveryPreview);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [checkoutState, setCheckoutState] = useState({
    customerName: user?.name || "",
    customerPhone: user?.phone || "",
    area: user?.location || SERVICE_AREAS[0],
    address: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const isRaining = weather === "rainy";

  useEffect(() => {
    setCheckoutState((current) => ({
      ...current,
      customerName: user?.name || current.customerName,
      customerPhone: user?.phone || current.customerPhone,
      area: user?.location || current.area,
    }));
  }, [user]);

  useEffect(() => {
    async function loadSession() {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setUser(data.user);
    }

    if (!user) {
      loadSession();
    }
  }, [user, setUser]);

  function updateCart(product, delta) {
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);

      if (!existing && delta > 0) {
        return [...current, { productId: product.id, name: product.name, unitPrice: product.price, quantity: 1 }];
      }

      return current
        .map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0);
    });
  }

  const itemsTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = itemsTotal + deliveryFee;
  const categories = ["All", ...new Set(products.map((product) => product.category).filter(Boolean))];
  const visibleProducts = selectedCategory === "All"
    ? products
    : products.filter((product) => product.category === selectedCategory);

  async function handleCheckout(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/orders/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...checkoutState,
        items: cart,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Checkout failed");
      return;
    }

    setMessage(data.message);
    setWeather(data.order.weather);
    setDeliveryFee(data.order.deliveryFee);
    setCart([]);
    router.push(`/orders?highlight=${data.order.id}`);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <section className="mb-10 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Neighborhood delivery</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">Shop food and essentials, then pay before we process.</h1>
          {user ? (
            <p className="mt-3 text-sm text-slate-300">
              Referral code: <strong className="text-white">{user.referralCode}</strong> • Free deliveries:{" "}
              <strong className="text-white">{user.freeDeliveryCredits || 0}</strong>
            </p>
          ) : null}
        </div>
        <div className="grid gap-2 text-sm text-slate-300">
          <span>Weather: <strong className="text-white">{isRaining ? "Rainy" : "Sunny"}</strong></span>
          <span>Coverage: <strong className="text-white">Ruaka - Gathigi Estate only</strong></span>
          <span>Delivery fee preview: <strong className="text-white">KES {deliveryFee}</strong></span>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section>
          <div className="mb-5 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-4 py-2 text-sm ${
                  selectedCategory === category
                    ? "bg-amber-400 text-slate-950"
                    : "border border-white/10 bg-white/5 text-slate-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {visibleProducts.map((product) => {
              const quantity = cart.find((item) => item.productId === product.id)?.quantity || 0;

              return (
                <article key={product.id} className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">{product.category}</p>
                      <h2 className="mt-1 text-xl font-semibold text-white">{product.name}</h2>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{product.unit}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-400">{product.description}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-xl font-semibold text-white">KES {product.price}</span>
                    <div className="flex items-center gap-2 rounded-full border border-white/10 px-2 py-2">
                      <button type="button" onClick={() => updateCart(product, -1)} className="size-8 rounded-full bg-white/10 text-white">-</button>
                      <span className="min-w-8 text-center text-white">{quantity}</span>
                      <button type="button" onClick={() => updateCart(product, 1)} className="size-8 rounded-full bg-amber-400 text-slate-950">+</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="h-fit rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold text-white">Cart summary</h2>
          <div className="mt-5 space-y-3 text-sm text-slate-300">
            {cart.length === 0 ? <p>Your cart is empty.</p> : null}
            {cart.map((item) => (
              <div key={item.productId} className="flex items-center justify-between">
                <span>{item.name} x {item.quantity}</span>
                <span>KES {item.unitPrice * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-2 rounded-3xl border border-white/10 bg-slate-900/80 p-4 text-sm">
            <div className="flex justify-between text-slate-300"><span>Items total</span><span>KES {itemsTotal}</span></div>
            <div className="flex justify-between text-slate-300"><span>Delivery fee</span><span>KES {deliveryFee}</span></div>
            <div className="flex justify-between text-base font-semibold text-white"><span>Final total</span><span>KES {total}</span></div>
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-400">
            Delivery fee uses server-side EAT timing and the admin-controlled rainy or sunny flag.
          </p>

          <form onSubmit={handleCheckout} className="mt-6 grid gap-3">
            <input className="input" placeholder="Full name" value={checkoutState.customerName} onChange={(e) => setCheckoutState((current) => ({ ...current, customerName: e.target.value }))} required />
            <input className="input" placeholder="M-PESA phone number" value={checkoutState.customerPhone} onChange={(e) => setCheckoutState((current) => ({ ...current, customerPhone: e.target.value }))} required />
            <select className="input" value={checkoutState.area} onChange={(e) => setCheckoutState((current) => ({ ...current, area: e.target.value }))}>
              {SERVICE_AREAS.map((area) => <option key={area}>{area}</option>)}
            </select>
            <textarea className="input min-h-28" placeholder="Exact Gathigi Estate delivery address" value={checkoutState.address} onChange={(e) => setCheckoutState((current) => ({ ...current, address: e.target.value }))} required />
            {message ? <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}
            <button disabled={loading || cart.length === 0} type="submit" className="rounded-full bg-emerald-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">
              {loading ? "Submitting..." : "Pay with M-PESA and place order"}
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}
