import { useEffect, useState, useCallback } from "react";
import { apiFetch, apiGetCached } from "../../lib/api";
import { useNotify } from "../../context/NotificationContext";
import { FaBoxOpen, FaMoneyBillWave, FaCloudRain, FaClock, FaCog, FaUsers } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import SystemSettings from "./SystemSettings";

const STATUS_OPTIONS = [
  { value: "PROCESSING", label: "Processing" },
  { value: "ON_THE_WAY", label: "On the way" },
  { value: "DELIVERED", label: "Delivered" },
];

function normalizeStatus(status) {
  const raw = String(status || "").toUpperCase();
  if (["CREATED", "PAYMENT_PENDING", "PAYMENT_CONFIRMED"].includes(raw)) return "PAYMENT_PENDING";
  if (["PAID", "PROCESSING", "VENDOR_ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "PENDING_RIDER", "RIDER_ASSIGNED"].includes(raw)) return "PROCESSING";
  if (raw === "ON_THE_WAY") return "ON_THE_WAY";
  if (raw === "DELIVERED") return "DELIVERED";
  if (raw === "REFUNDED") return "REFUNDED";
  if (raw === "CANCELLED") return "CANCELLED";
  return raw;
}

export default function AdminDashboard() {
  const [activeModal, setActiveModal] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    unpaidOrders: 0,
    paidOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    isRaining: false,
  });
  const [notifications, setNotifications] = useState([]);
  const { notify } = useNotify();

  const addNotification = useCallback((msg, type = "info") => {
    const id = Date.now();
    setNotifications((prev) => [{ id, msg, type }, ...prev.slice(0, 4)]);
    notify(msg, type);
    window.setTimeout(() => {
      setNotifications((prev) => prev.filter((entry) => entry.id !== id));
    }, 5000);
  }, [notify]);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await apiGetCached("/api/admin/dashboard", { ttlMs: 3000 });
      setStats(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await apiFetch("/api/admin/orders");
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchOrders();
  }, [fetchDashboard, fetchOrders]);

  const updateOrderStatus = async (orderId, status) => {
    try {
      const updatedOrder = await apiFetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      setOrders((prev) => prev.map((order) => (order._id === orderId ? updatedOrder : order)));
      addNotification(`Order moved to ${status.replaceAll("_", " ")}.`, "success");
      fetchDashboard();
    } catch (error) {
      console.error(error);
      addNotification("Failed to update order status.", "error");
    }
  };

  return (
    <div className="flex min-h-screen bg-transparent text-riderLight font-sans selection:bg-riderMaroon selection:text-riderLight overflow-hidden">
      <aside className="w-20 lg:w-64 bg-white/60 backdrop-blur-xl border-r border-riderBlue/10 flex flex-col items-center lg:items-start py-8 transition-all z-20 shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-b from-riderBlue/5 to-riderMaroon/5 pointer-events-none"></div>
        <div className="mb-12 px-6 flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-riderBlue to-riderMaroon shadow-lg shadow-riderBlue/20"></div>
          <span className="text-xl font-extrabold hidden lg:block tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-riderBlue to-riderMaroon">
            Admin<span className="font-black">Dashboard</span>
          </span>
        </div>

        <nav className="w-full space-y-3 px-3 relative z-10">
          <NavItem icon={<FaBoxOpen />} label="Overview" active={activeModal === null} onClick={() => setActiveModal(null)} />
          <NavItem icon={<FaClock />} label="Orders" active={activeModal === "orders"} onClick={() => setActiveModal("orders")} />
          <NavItem icon={<FaCog />} label="Weather" active={activeModal === "settings"} onClick={() => setActiveModal("settings")} />
        </nav>

        <div className="mt-auto w-full px-3 relative z-10">
          <button
            onClick={() => { window.location.href = "/"; }}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-full text-gray-600 hover:text-white hover:bg-riderBlue transition-all font-bold hover:shadow-lg"
          >
            <span className="text-lg">←</span>
            <span className="hidden lg:block">Go Back</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 relative overflow-y-auto h-screen p-4 lg:p-10">
        <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold">Single-Rider Control Panel</h1>
            <p className="text-gray-600 text-sm mt-1">Manage weather, paid orders, and delivery progress for Ruaka - Gathigi Estate.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-full text-sm font-bold ${stats.isRaining ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
              {stats.isRaining ? "Rainy pricing active" : "Sunny pricing active"}
            </div>
          </div>
        </header>

        <div className="absolute top-10 right-10 flex flex-col gap-2 z-50 pointer-events-none">
          <AnimatePresence>
            {notifications.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`pointer-events-auto px-4 py-3 rounded-xl shadow-2xl border border-riderBlue/10 text-sm font-medium ${
                  entry.type === "success" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                }`}
              >
                {entry.msg}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <StatCard title="Total Revenue" value={`KES ${stats.totalRevenue || 0}`} icon={<FaMoneyBillWave className="text-white text-2xl" />} color="bg-gradient-to-br from-green-400 to-emerald-600" />
            <StatCard title="Total Orders" value={stats.totalOrders || 0} icon={<FaBoxOpen className="text-white text-2xl" />} color="bg-gradient-to-br from-purple-400 to-violet-600" />
            <StatCard title="Unpaid Orders" value={stats.unpaidOrders || 0} icon={<FaClock className="text-white text-2xl" />} color="bg-gradient-to-br from-pink-400 to-rose-600" />
            <StatCard title="Paid Orders" value={stats.paidOrders || 0} icon={<FaMoneyBillWave className="text-white text-2xl" />} color="bg-gradient-to-br from-blue-400 to-indigo-600" />
            <StatCard title="Active Deliveries" value={stats.processingOrders || 0} icon={<FaCloudRain className="text-white text-2xl" />} color="bg-gradient-to-br from-cyan-400 to-sky-600" />
            <StatCard title="Customers" value={stats.totalUsers || 0} icon={<FaUsers className="text-white text-2xl" />} color="bg-gradient-to-br from-orange-400 to-red-500" />
          </div>

          {(activeModal === null || activeModal === "orders") && (
            <section className="rounded-3xl bg-white/70 backdrop-blur-md border border-riderBlue/10 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Incoming Orders</h2>
                  <p className="text-sm text-gray-600">Paid orders move through Processing → On the way → Delivered.</p>
                </div>
                <button
                  onClick={() => {
                    fetchOrders();
                    fetchDashboard();
                  }}
                  className="px-4 py-2 rounded-xl bg-riderBlue text-white font-bold"
                >
                  Refresh
                </button>
              </div>

              <div className="space-y-4">
                {orders.map((order) => {
                  const status = normalizeStatus(order.status);
                  const canAdvance = ["PROCESSING", "ON_THE_WAY", "DELIVERED"].includes(status) || status === "PAYMENT_PENDING";
                  return (
                    <div key={order._id} className="rounded-2xl border border-riderBlue/10 bg-white/80 p-5 shadow-sm">
                      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              order.paid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                            }`}>
                              {order.paid ? "Paid" : "Awaiting payment"}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-riderBlue/10 text-riderBlue">
                              {status.replaceAll("_", " ")}
                            </span>
                            <span className="text-xs text-gray-500">#{order._id.slice(-6).toUpperCase()}</span>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h3 className="font-bold text-lg">{order.userId?.name || "Customer"}</h3>
                              <p className="text-sm text-gray-600">{order.userId?.email || "No email"}</p>
                              <p className="text-sm text-gray-600 mt-1">{order.dropoff?.address || "Ruaka - Gathigi Estate"}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <InfoPill label="Items" value={`KES ${order.goodsTotal || 0}`} />
                              <InfoPill label="Delivery" value={`KES ${order.deliveryFee || 0}`} />
                              <InfoPill label="Total" value={`KES ${order.amount || 0}`} />
                            </div>
                          </div>

                          <div className="mt-4 rounded-2xl bg-gray-50 border border-gray-100 p-4">
                            <div className="text-sm font-bold text-riderLight mb-2">Order breakdown</div>
                            <ul className="space-y-2 text-sm text-gray-700">
                              {(order.items || []).map((item, index) => (
                                <li key={`${order._id}-${index}`} className="flex justify-between gap-4">
                                  <span>{item.name || "Item"} x{item.quantity || 1}</span>
                                  <span className="font-bold">KES {(item.price || 0) * (item.quantity || 1)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="xl:w-64 space-y-3">
                          {canAdvance ? (
                            STATUS_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => updateOrderStatus(order._id, option.value)}
                                disabled={!order.paid || status === option.value}
                                className="w-full px-4 py-3 rounded-xl font-bold bg-riderBlue text-white hover:bg-blue-600 disabled:opacity-40"
                              >
                                Mark {option.label}
                              </button>
                            ))
                          ) : (
                            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                              No admin action needed.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {orders.length === 0 && (
                  <div className="text-center py-16 text-gray-500">
                    No orders found.
                  </div>
                )}
              </div>
            </section>
          )}

          {activeModal === "settings" && (
            <section className="rounded-3xl bg-white/70 backdrop-blur-md border border-riderBlue/10 p-6 shadow-xl">
              <SystemSettings notify={notify} />
            </section>
          )}
        </motion.div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold ${
        active ? "bg-riderBlue text-white shadow-lg" : "text-gray-600 hover:bg-white/70 hover:text-riderLight"
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="hidden lg:block">{label}</span>
    </button>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="rounded-3xl bg-white/70 backdrop-blur-md border border-riderBlue/10 p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-600 font-semibold">{title}</p>
          <h3 className="text-3xl font-extrabold mt-2">{value}</h3>
        </div>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-xl bg-black/5 px-3 py-3">
      <div className="text-xs uppercase tracking-wide text-gray-500 font-bold">{label}</div>
      <div className="font-bold text-riderLight mt-1">{value}</div>
    </div>
  );
}
