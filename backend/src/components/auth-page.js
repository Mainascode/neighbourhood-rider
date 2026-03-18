"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../app/providers.js";

const INITIAL_SIGNUP = {
  name: "",
  email: "",
  phone: "",
  location: "Ruaka",
  password: "",
  referralCode: "",
};

export default function AuthPage({ initialMode = "login" }) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [mode, setMode] = useState(initialMode === "signup" ? "signup" : "login");
  const [loginValues, setLoginValues] = useState({ email: "", password: "" });
  const [signupValues, setSignupValues] = useState(INITIAL_SIGNUP);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
    const payload = mode === "signup" ? signupValues : loginValues;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Authentication failed");
      return;
    }

    setUser(data.user);
    router.push(data.user.role === "admin" ? "/admin" : "/shop");
    router.refresh();
  }

  const activeValues = mode === "signup" ? signupValues : loginValues;
  const setActiveValues = mode === "signup" ? setSignupValues : setLoginValues;

  return (
    <main className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-5">
        <span className="inline-flex rounded-full bg-white/10 px-4 py-1 text-sm text-amber-200">
          Login for customers and the single admin
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Checkout starts with a simple account.
        </h1>
        <p className="max-w-lg text-base leading-7 text-slate-300">
          Customers can browse, pay, track, and rate deliveries. The admin account uses the email configured in the environment.
        </p>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30">
        <div className="mb-6 flex gap-2 rounded-full bg-slate-900 p-1">
          {["login", "signup"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`flex-1 rounded-full px-4 py-3 text-sm font-medium capitalize ${
                mode === item ? "bg-amber-400 text-slate-950" : "text-slate-300"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {mode === "signup" && (
            <>
              <input className="input" placeholder="Full name" value={activeValues.name} onChange={(e) => setActiveValues((current) => ({ ...current, name: e.target.value }))} required />
              <input className="input" placeholder="Phone number" value={activeValues.phone} onChange={(e) => setActiveValues((current) => ({ ...current, phone: e.target.value }))} required />
              <select className="input" value={activeValues.location} onChange={(e) => setActiveValues((current) => ({ ...current, location: e.target.value }))}>
                <option>Ruaka</option>
                <option>Gachie</option>
                <option>Gathiga</option>
              </select>
            </>
          )}
          <input className="input" type="email" placeholder="Email address" value={activeValues.email} onChange={(e) => setActiveValues((current) => ({ ...current, email: e.target.value }))} required />
          <input className="input" type="password" placeholder="Password" value={activeValues.password} onChange={(e) => setActiveValues((current) => ({ ...current, password: e.target.value }))} required />
          {mode === "signup" && (
            <input className="input" placeholder="Referral code (optional)" value={activeValues.referralCode} onChange={(e) => setActiveValues((current) => ({ ...current, referralCode: e.target.value.toUpperCase() }))} />
          )}
          {message ? <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{message}</p> : null}
          <button type="submit" disabled={loading} className="rounded-full bg-emerald-400 px-5 py-3 font-semibold text-slate-950">
            {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
