import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { FaBars, FaTimes } from "react-icons/fa";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Wallet removed
  }, [user]);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-gray-100 text-riderLight px-4 md:px-6 py-3 md:py-4 flex justify-between items-center transition-all duration-300 shadow-sm">
      <Link to="/" className="group whitespace-nowrap flex items-center gap-2">
        <span className="text-3xl">🔔</span>
        <span className="leading-tight">
          <span className="block text-[10px] md:text-xs tracking-[0.2em] uppercase text-gray-500 font-semibold">
            Welcome To
          </span>
          <span className="block font-black text-lg md:text-2xl tracking-tight bg-gradient-to-r from-riderMaroon via-riderBlue to-riderMaroon bg-clip-text text-transparent group-hover:brightness-110 transition-all">
            Nitume Doorbell Service
          </span>
        </span>
      </Link>

      {/* Mobile Toggle */}
      <button onClick={() => setIsMenuOpen(true)} className="lg:hidden text-riderLight text-2xl p-2 z-50 relative hover:text-riderMaroon transition-colors">
        <FaBars />
      </button>

      {/* Desktop Menu */}
      <div className="hidden lg:flex gap-6 items-center text-sm font-medium">
        {!user && (
          <>
            <NavLink to="/login" label="Login" />
            <NavLink to="/register" label="Register" />
          </>
        )}

        {user?.role === "user" && (
          <>
            <NavLink to="/order" label="Order" />
            <NavLink to="/parcel" label="Send Parcel" />
            <NavLink to="/orders" label="My Orders" />
            <NavLink to="/faqs" label="FAQs" />
          </>
        )}

        {user?.role === "rider" && (
          <>
            <NavLink to="/rider/dashboard" label="Rider Dashboard" />
            <NavLink to="/rider/settings" label="Settings" />
          </>
        )}

        {user?.role === "admin" && (
          <>
            <NavLink to="/admin/dashboard" label="Admin Panel" />
          </>
        )}

        {user?.role === "vendor" && (
          <>
            <NavLink to="/vendor/dashboard" label="Vendor Dashboard" />
            <NavLink to="/vendor/settings" label="Settings" />
          </>
        )}

        {user && (
          <div className="flex items-center gap-4">
            <button
              onClick={logout}
              className="bg-gradient-to-r from-riderMaroon to-orange-500 text-white shadow-lg shadow-riderMaroon/30 hover:shadow-riderMaroon/40 border-0 px-6 py-2.5 rounded-full font-bold transition-all hover:-translate-y-1 active:scale-95"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Mobile Mobile Overlay */}
      {/* Mobile Menu Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Mobile Sliding Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-riderBlack/95 backdrop-blur-xl z-50 shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-riderLight">Menu</h2>
            <button onClick={() => setIsMenuOpen(false)} className="text-riderLight text-2xl hover:text-riderMaroon transition-colors">
              <FaTimes />
            </button>
          </div>

          <div className="flex flex-col gap-6 text-lg font-medium">
            {user && (
              <div className="bg-white/10 p-3 rounded-xl text-white border border-white/10 mb-2">
                <p className="text-xs text-gray-400 uppercase font-bold">Account</p>
                <p className="font-bold">{user?.name || "User"}</p>
              </div>
            )}

            {!user && (
              <>
                <Link to="/login" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>Login</Link>
                <Link to="/register" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>Register</Link>
              </>
            )}

            {user?.role === "user" && (
              <>
                <Link to="/order" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>Order</Link>
                <Link to="/parcel" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>Send Parcel</Link>
                <Link to="/orders" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>My Orders</Link>
                <Link to="/faqs" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>FAQs</Link>
              </>
            )}

            {user?.role === "rider" && (
              <>
                <Link to="/rider/dashboard" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>Rider Dashboard</Link>
                <Link to="/rider/settings" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>Settings</Link>
              </>
            )}

            {user?.role === "admin" && (
              <Link to="/admin/dashboard" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>Admin Panel</Link>
            )}

            {user?.role === "vendor" && (
              <>
                <Link to="/vendor/dashboard" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>Vendor Dashboard</Link>
                <Link to="/vendor/settings" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>Settings</Link>
              </>
            )}

          </div>

          <div className="mt-auto pt-8 border-t border-riderBlue/10">
            {user && (
              <button
                onClick={() => { logout(); setIsMenuOpen(false); }}
                className="w-full bg-gradient-to-r from-riderMaroon to-orange-500 text-white shadow-lg px-6 py-2.5 rounded-xl font-bold hover:shadow-xl transition-all"
              >
                Logout
              </button>
            )}
            <p className="text-xs text-center text-gray-500 mt-4">© 2025 Neighborhood Rider</p>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, label }) {
  return (
    <Link to={to} className="relative group text-riderLight/80 hover:text-riderMaroon transition-colors">
      {label}
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-riderMaroon transition-all group-hover:w-full"></span>
    </Link>
  );
}
