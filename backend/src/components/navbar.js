"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useCart } from "../app/providers.js";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { cart } = useCart();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
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
