import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full bg-riderBlack/90 backdrop-blur-xl border-b border-riderBlue/10 text-riderLight px-4 md:px-6 py-3 md:py-4 flex justify-between items-center transition-all duration-300 shadow-sm">
      <Link to="/" className="font-extrabold text-lg md:text-2xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-riderBlue to-riderMaroon hover:scale-105 transition-transform whitespace-nowrap">
        NEIGHBORHOOD <span className="font-black">RIDER</span>
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
            <NavLink to="/orders" label="My Orders" />
            <NavLink to="/faqs" label="FAQs" />
          </>
        )}

        {user?.role === "rider" && (
          <>
            <NavLink to="/rider/map" label="Live Map" />
            <NavLink to="/rider/orders" label="Assigned Orders" />
            <NavLink to="/rider/dashboard" label="Dashboard" />
          </>
        )}

        {user?.role === "admin" && (
          <>
            <NavLink to="/admin/dashboard" label="Admin Panel" />
          </>
        )}

        {user && (
          <button
            onClick={logout}
            className="bg-gradient-to-r from-riderMaroon to-orange-500 text-white shadow-lg shadow-riderMaroon/30 hover:shadow-riderMaroon/40 border-0 px-6 py-2.5 rounded-full font-bold transition-all hover:-translate-y-1 active:scale-95"
          >
            Logout
          </button>
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
            {!user && (
              <>
                <Link to="/login" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>Login</Link>
                <Link to="/register" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>Register</Link>
              </>
            )}

            {user?.role === "user" && (
              <>
                <Link to="/order" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>Order</Link>
                <Link to="/orders" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>My Orders</Link>
                <Link to="/faqs" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>FAQs</Link>
              </>
            )}

            {user?.role === "rider" && (
              <>
                <Link to="/rider/map" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>Live Map</Link>
                <Link to="/rider/orders" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>Assigned Orders</Link>
                <Link to="/rider/dashboard" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
              </>
            )}

            {user?.role === "admin" && (
              <Link to="/admin/dashboard" className="hover:text-riderMaroon transition-colors" onClick={() => setIsMenuOpen(false)}>Admin Panel</Link>
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
