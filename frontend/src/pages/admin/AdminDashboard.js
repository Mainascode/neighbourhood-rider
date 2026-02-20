import { useEffect, useState, useCallback } from "react";
import { apiFetch, apiGetCached } from "../../lib/api";
import { useNotify } from "../../context/NotificationContext";
import { socket } from "../../lib/socket.js";
import { FaBoxOpen, FaMoneyBillWave, FaMotorcycle, FaQuestionCircle, FaBell, FaStore, FaCog, FaUsers } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import FinanceDashboard from "./FinanceDashboard";
import SystemSettings from "./SystemSettings";

export default function AdminDashboard() {
  const [activeModal, setActiveModal] = useState(null); // changed from activeTab
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [faqs, setFaqs] = useState([]);


  const [stats, setStats] = useState({
    totalOrders: 0,
    unpaidOrders: 0,
    activeRiders: 0,
    totalRiders: 0,
    totalVendors: 0,
    totalUsers: 0,
    totalRevenue: 0,
  });

  const [selectedRider, setSelectedRider] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedOrderForAssignment, setSelectedOrderForAssignment] = useState(null);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "", isPublished: true });
  const [testFlowLoading, setTestFlowLoading] = useState(false);
  const [gpsSimOrders, setGpsSimOrders] = useState({});
  const [testFlowStep, setTestFlowStep] = useState("");
  const [testFlowOrderId, setTestFlowOrderId] = useState("");
  const { notify } = useNotify();

  /* 🛠️ Actions */
  const handleAssignOrder = async (orderId, riderId) => {
    try {
      await apiFetch("/api/orders/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, riderId })
      });
      notify("Order assigned successfully!", "success");
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: "RIDER_ASSIGNED" } : o));
      setSelectedOrderForAssignment(null);
    } catch (err) {
      console.error(err);
      notify("Error assigning order", "error");
    }
  };

  /* 🔔 Live Notifications State */
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((msg, type = "info") => {
    const id = Date.now();
    setNotifications((prev) => [{ id, msg, type }, ...prev]);
    notify(msg, type); // Also show toast
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, [notify]);
  const fetchDashboard = useCallback(async () => {
    try {
      const data = await apiGetCached("/api/admin/dashboard", { ttlMs: 5000 });
      setStats(data);
    } catch (err) { console.error(err); }
  }, []);


  /* 📡 Live Data Listeners */
  useEffect(() => {
    socket.on("client:searching", (data) => {
      addNotification(`🔍 ${data.name} is looking for a rider!`, "info");
    });

    socket.on("admin:order:new", (order) => {
      addNotification(`🛎️ New Order #${order._id.slice(-6)} received!`, "success");
      setOrders(prev => [order, ...prev]);
      fetchDashboard(); // Refresh stats
    });

    return () => {
      socket.off("client:searching");
      socket.off("admin:order:new");
    };
  }, [addNotification, fetchDashboard]);


  /* 📥 Fetch Data */

  const fetchRiders = useCallback(async () => {
    try {
      const data = await apiFetch("/api/admin/riders");
      setRiders(data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await apiFetch("/api/admin/orders");
      setOrders(data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchFaqs = useCallback(async () => {
    try {
      const data = await apiFetch("/api/faqs/all"); // Fetch ALL for admin
      setFaqs(data);
    } catch (err) { console.error(err); }
  }, []);



  const fetchVendors = useCallback(async () => {
    try {
      const data = await apiFetch("/api/admin/vendors");
      setVendors(data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetchDashboard(); // Always fetch dashboard stats
    if (activeModal === "riders") fetchRiders();
    if (activeModal === "vendors") fetchVendors();
    if (activeModal === "orders") fetchOrders();
    if (activeModal === "faqs") fetchFaqs();
    if (activeModal === "faqs") fetchFaqs();
  }, [activeModal, fetchDashboard, fetchRiders, fetchOrders, fetchFaqs, fetchVendors]);

  useEffect(() => {
    if (!testFlowOrderId) return;
    const interval = setInterval(async () => {
      try {
        const data = await apiFetch("/api/admin/orders");
        setOrders(data);
        const match = data.find(o => o._id === testFlowOrderId);
        if (match) setTestFlowStep(match.status);
      } catch (e) {
        // ignore
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [testFlowOrderId]);


  /* 🛠️ Actions */
  const handleApproveRider = async (id, status) => {
    const data = await apiFetch(`/api/admin/riders/${id}/approve`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status })
    });
    if (data) {
      notify(`Rider ${status}`, "success");
      fetchRiders();
      setSelectedRider(null);
    }
  };

  const handleApproveVendor = async (id, status) => {
    const data = await apiFetch(`/api/admin/vendors/${id}/approve`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status })
    });
    if (data) {
      notify(`Vendor ${status}`, "success");
      fetchVendors();
      setSelectedVendor(null);
    }
  };

  const handleAddFaq = async (e) => {
    e.preventDefault();
    const url = newFaq._id
      ? `/api/faqs/${newFaq._id}`
      : "/api/faqs";

    const method = newFaq._id ? "PUT" : "POST";

    const data = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newFaq)
    });

    if (data) {
      notify(newFaq._id ? "FAQ Updated" : "FAQ Added", "success");
      setNewFaq({ question: "", answer: "", isPublished: true });
      fetchFaqs();
    }
  };

  const handleDeleteFaq = async (id) => {
    await apiFetch(`/api/faqs/${id}`, { method: "DELETE" });
    notify("FAQ Deleted", "info");
    setFaqs(prev => prev.filter(f => f._id !== id));
  }

  const runTestSeedVendors = async () => {
    try {
      setTestFlowLoading(true);
      const data = await apiFetch("/api/admin/test/seed-vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 3 })
      });
      notify(`Seeded ${data.createdCount} vendors`, "success");
      fetchVendors();
    } catch (e) {
      notify("Seed failed", "error");
    } finally {
      setTestFlowLoading(false);
    }
  };

  const runTestFlow = async () => {
    try {
      setTestFlowLoading(true);
      setTestFlowStep("Creating order");
      const data = await apiFetch("/api/admin/test/flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      notify(`Test flow started: ${data.orderId}`, "success");
      setTestFlowStep("Order created");
      setTestFlowOrderId(data.orderId);
      if (data.order) {
        setOrders(prev => [data.order, ...prev.filter(o => o._id !== data.order._id)]);
      }
      setActiveModal("orders");
    } catch (e) {
      notify("Test flow failed", "error");
      setTestFlowStep("");
      setTestFlowOrderId("");
    } finally {
      setTestFlowLoading(false);
    }
  };

  const runSeedRiderOnline = async () => {
    try {
      setTestFlowLoading(true);
      await apiFetch("/api/admin/test/seed-rider-online", {
        method: "POST"
      });
      notify("Test rider created and set online", "success");
      fetchRiders();
    } catch (e) {
      notify("Failed to create test rider", "error");
    } finally {
      setTestFlowLoading(false);
    }
  };

  const runSeedUser = async () => {
    try {
      setTestFlowLoading(true);
      await apiFetch("/api/admin/test/seed-user", {
        method: "POST"
      });
      notify("Test user created", "success");
    } catch (e) {
      notify("Failed to create test user", "error");
    } finally {
      setTestFlowLoading(false);
    }
  };

  const runSeedAll = async () => {
    try {
      setTestFlowLoading(true);
      await apiFetch("/api/admin/test/seed-all", {
        method: "POST"
      });
      notify("Test user + vendor + rider created", "success");
      fetchVendors();
      fetchRiders();
    } catch (e) {
      notify("Failed to seed all", "error");
    } finally {
      setTestFlowLoading(false);
    }
  };

  const toggleGpsSim = async (orderId) => {
    const nextAction = gpsSimOrders[orderId] ? "stop" : "start";
    try {
      await apiFetch("/api/admin/test/simulate-gps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: nextAction })
      });
      setGpsSimOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
    } catch (e) {
      notify("Failed to toggle GPS simulation", "error");
    }
  };


  return (
    <div className="flex min-h-screen bg-transparent text-riderLight font-sans selection:bg-riderMaroon selection:text-riderLight overflow-hidden">

      {/* 🧭 Sidebar */}
      <aside className="w-20 lg:w-64 bg-white/60 backdrop-blur-xl border-r border-riderBlue/10 flex flex-col items-center lg:items-start py-8 transition-all z-20 shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-b from-riderBlue/5 to-riderMaroon/5 pointer-events-none"></div>
        <div className="mb-12 px-6 flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-riderBlue to-riderMaroon shadow-lg shadow-riderBlue/20"></div>
          <span className="text-xl font-extrabold hidden lg:block tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-riderBlue to-riderMaroon">Admin<span className="font-black">Panel</span></span>
        </div>

        <nav className="w-full space-y-3 px-3 relative z-10">
          <NavItem icon={<FaBoxOpen />} label="Dashboard" active={activeModal === null} onClick={() => setActiveModal(null)} />
          <NavItem icon={<FaMotorcycle />} label="Riders" active={activeModal === "riders"} onClick={() => setActiveModal("riders")} />
          <NavItem icon={<FaStore />} label="Vendors" active={activeModal === "vendors"} onClick={() => setActiveModal("vendors")} />
          <NavItem icon={<FaMoneyBillWave />} label="Live Orders" active={activeModal === "orders"} onClick={() => setActiveModal("orders")} />
          <NavItem icon={<FaQuestionCircle />} label="FAQs" active={activeModal === "faqs"} onClick={() => setActiveModal("faqs")} />

          <NavItem icon={<FaMoneyBillWave />} label="Finance & Payouts" active={activeModal === "finance"} onClick={() => setActiveModal("finance")} />
          <NavItem icon={<FaCog />} label="System Settings" active={activeModal === "settings"} onClick={() => setActiveModal("settings")} />

        </nav>

        <div className="mt-auto w-full px-3 relative z-10">
          <button
            onClick={() => window.location.href = "/"}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-full text-gray-600 hover:text-white hover:bg-riderBlue transition-all font-bold hover:shadow-lg"
          >
            <span className="text-lg">←</span>
            <span className="hidden lg:block">Go Back</span>
          </button>
        </div>
      </aside>

      {/* 🚀 Main Content */}
      <main className="flex-1 relative overflow-y-auto h-screen p-4 lg:p-10">

        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, Admin 👋</h1>
            <p className="text-gray-600 text-sm mt-1">Here is what is happening in your neighborhood today.</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <button
                onClick={runTestSeedVendors}
                disabled={testFlowLoading}
                className="px-4 py-2 rounded-full text-xs font-bold bg-riderBlue text-white hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                Seed Vendors
              </button>
              <button
                onClick={runSeedRiderOnline}
                disabled={testFlowLoading}
                className="px-4 py-2 rounded-full text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all disabled:opacity-50"
              >
                Create Test Rider
              </button>
              <button
                onClick={runSeedUser}
                disabled={testFlowLoading}
                className="px-4 py-2 rounded-full text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 transition-all disabled:opacity-50"
              >
                Create Test User
              </button>
              <button
                onClick={runSeedAll}
                disabled={testFlowLoading}
                className="px-4 py-2 rounded-full text-xs font-bold bg-pink-600 text-white hover:bg-pink-700 transition-all disabled:opacity-50"
              >
                Seed All
              </button>
              <button
                onClick={runTestFlow}
                disabled={testFlowLoading}
                className="px-4 py-2 rounded-full text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50"
              >
                Run Test Flow
              </button>
            </div>
            <div className="relative cursor-pointer hover:text-riderBlue transition-colors">
              <FaBell className="text-xl" />
              {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-riderMaroon to-pink-600 border-2 border-riderBlue/10"></div>
          </div>
        </header>

        {testFlowStep && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 text-green-600 rounded-xl px-4 py-3 text-sm font-semibold">
            Test flow status: {testFlowStep}
          </div>
        )}

        {/* 🔔 Notifications Feed */}
        <div className="absolute top-10 right-10 flex flex-col gap-2 z-50 pointer-events-none">
          <AnimatePresence>
            {notifications.map(n => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`pointer-events-auto px-4 py-3 rounded-xl shadow-2xl border border-riderBlue/10 text-sm font-medium
                            ${n.type === "success" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}
                        `}
              >
                {n.msg}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>


        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Revenue"
              value={`KES ${stats.totalRevenue}`}
              icon={<FaMoneyBillWave className="text-white text-2xl" />}
              color="bg-gradient-to-br from-green-400 to-emerald-600"
              onClick={() => setActiveModal("orders")}
            />
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon={<FaUsers className="text-white text-2xl" />}
              color="bg-gradient-to-br from-orange-400 to-red-500"
              onClick={() => { }}
            />
            <StatCard
              title="Active Riders"
              value={`${stats.activeRiders} / ${stats.totalRiders}`}
              icon={<FaMotorcycle className="text-white text-2xl" />}
              color="bg-gradient-to-br from-blue-400 to-indigo-600"
              onClick={() => setActiveModal("riders")}
            />
            <StatCard
              title="Total Vendors"
              value={stats.totalVendors}
              icon={<FaStore className="text-white text-2xl" />}
              color="bg-gradient-to-br from-teal-400 to-cyan-600"
              onClick={() => setActiveModal("vendors")}
            />
            <StatCard
              title="Total Orders"
              value={stats.totalOrders}
              icon={<FaBoxOpen className="text-white text-2xl" />}
              color="bg-gradient-to-br from-purple-400 to-violet-600"
              onClick={() => setActiveModal("orders")}
            />
            <StatCard
              title="Unpaid Orders"
              value={stats.unpaidOrders}
              icon={<FaBell className="text-white text-2xl" />}
              color="bg-gradient-to-br from-pink-400 to-rose-600"
              onClick={() => setActiveModal("orders")}
            />
          </div>
        </motion.div>

        {/* MODALS FOR FEATURES */}
        <AnimatePresence>

          {/* 🏍️ RIDERS MODAL */}
          {activeModal === "riders" && (
            <DashboardModal title="Manage Riders" onClose={() => setActiveModal(null)}>
              <table className="w-full text-left border-collapse">
                <thead className="bg-riderDark/20 text-gray-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Rider</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Online</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {riders.map(r => (
                    <tr key={r._id} className="hover:bg-riderDark/50 transition-colors">
                      <td className="p-4 font-medium">{r.name}</td>
                      <td className="p-4 text-gray-600">{r.phone}</td>
                      <td className="p-4"><StatusBadge status={r.status} /></td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${r.isAvailable ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-500"}`}>
                          {r.isAvailable ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td className="p-4">
                        <button onClick={() => setSelectedRider(r)} className="text-blue-400 hover:text-blue-300 font-medium">Manage</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DashboardModal>
          )}

          {/* 🏪 VENDORS MODAL */}
          {activeModal === "vendors" && (
            <DashboardModal title="Manage Vendors" onClose={() => setActiveModal(null)}>
              <table className="w-full text-left border-collapse">
                <thead className="bg-riderDark/20 text-gray-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Store Name</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {vendors.map(v => (
                    <tr key={v._id} className="hover:bg-riderDark/50 transition-colors">
                      <td className="p-4 font-bold">{v.storeName}</td>
                      <td className="p-4 text-gray-600">{v.phone}</td>
                      <td className="p-4 text-gray-600">{v.address || "N/A"}</td>
                      <td className="p-4"><StatusBadge status={v.status} /></td>
                      <td className="p-4">
                        <button onClick={() => setSelectedVendor(v)} className="text-blue-400 hover:text-blue-300 font-medium">Review</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DashboardModal>
          )}

          {/* 📦 ORDERS MODAL */}
          {activeModal === "orders" && (
            <DashboardModal title="Live Orders" onClose={() => setActiveModal(null)}>
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order._id} className={`bg-riderDark/40 backdrop-blur-md p-4 rounded-xl border border-riderBlue/10 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-riderBlue/30 transition-all ${order.isBotOrder ? "border-l-4 border-l-riderBlue" : ""}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-riderDark/50 flex items-center justify-center text-xl">
                        {order.isBotOrder ? "🤖" : "📦"}
                      </div>
                      <div>
                        <h4 className="font-bold">Order #{order._id.slice(-6)}</h4>
                        <p className="text-sm text-gray-600">
                          {order.items?.length || 1} items • {typeof order.location === 'string' ? order.location : (order.pickup?.address || "No location")}
                        </p>
                        {order.isBotOrder && <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">Bot Order</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-bold text-riderMaroon">KES {order.amount}</p>
                        <p className={`text-xs capitalize font-bold ${["CREATED", "PAYMENT_PENDING"].includes(order.status) ? "text-yellow-500" : "text-green-500"}`}>{order.status}</p>
                      </div>

                      {order.status === "READY_FOR_PICKUP" && (
                        <button
                          onClick={() => setSelectedOrderForAssignment(order)}
                          className="bg-riderBlue hover:bg-blue-600 text-riderLight px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                        >
                          Assign
                        </button>
                      )}

                      {order.status === "DELIVERED" && (
                        <button
                          onClick={async () => {
                            if (!window.confirm("Confirm payment to Rider? This will mark the order as Completed.")) return;
                            try {
                              await apiFetch("/api/orders/pay", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ orderId: order._id })
                              });
                              notify("Order Paid & Completed!", "success");
                              fetchOrders();
                              fetchDashboard();
                            } catch (e) {
                              notify("Connection error", "error");
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-riderLight px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-md"
                        >
                          Pay Rider 💸
                        </button>
                      )}
                      <button
                        onClick={() => toggleGpsSim(order._id)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold ${gpsSimOrders[order._id] ? "bg-red-500 text-white" : "bg-blue-500/20 text-blue-400"}`}
                      >
                        {gpsSimOrders[order._id] ? "Stop GPS" : "Simulate GPS"}
                      </button>
                      <button className="bg-riderBlue/10 hover:bg-riderBlue/20 p-2 rounded-lg transition-colors text-sm">Details</button>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <p className="text-gray-500 text-center py-10">No orders found.</p>}
              </div>
            </DashboardModal>
          )}

          {/* ❓ FAQS MODAL */}
          {activeModal === "faqs" && (
            <DashboardModal title="FAQs Management" onClose={() => setActiveModal(null)}>
              <form onSubmit={handleAddFaq} className="bg-riderDark/40 backdrop-blur-md p-6 rounded-2xl border border-riderBlue/10 mb-8">
                <h3 className="text-lg font-bold mb-4">{newFaq._id ? "Edit FAQ" : "Add New FAQ"}</h3>
                <div className="space-y-4">
                  <input
                    value={newFaq.question}
                    onChange={e => setNewFaq({ ...newFaq, question: e.target.value })}
                    placeholder="Question"
                    className="w-full bg-riderDark/30 border border-riderBlue/10 rounded-xl p-3 outline-none focus:border-riderBlue"
                  />
                  <textarea
                    value={newFaq.answer}
                    onChange={e => setNewFaq({ ...newFaq, answer: e.target.value })}
                    placeholder="Answer"
                    className="w-full bg-riderDark/30 border border-riderBlue/10 rounded-xl p-3 outline-none focus:border-riderBlue h-24"
                  />

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newFaq.isPublished}
                        onChange={e => setNewFaq({ ...newFaq, isPublished: e.target.checked })}
                        className="w-5 h-5 accent-riderBlue"
                      />
                      <span className="text-gray-700">Published</span>
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button className="bg-riderBlue hover:bg-blue-600 text-riderLight px-6 py-2 rounded-xl font-bold transition-transform active:scale-95">
                      {newFaq._id ? "Update FAQ" : "Publish FAQ"}
                    </button>
                    {newFaq._id && (
                      <button
                        type="button"
                        onClick={() => setNewFaq({ question: "", answer: "", isPublished: true })}
                        className="bg-gray-600 hover:bg-gray-700 text-riderLight px-6 py-2 rounded-xl font-bold transition-transform active:scale-95"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </form>

              <div className="space-y-4">
                {faqs.map(faq => (
                  <div key={faq._id} className="bg-riderDark/40 backdrop-blur-md p-6 rounded-2xl border border-riderBlue/10 flex justify-between items-start group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-lg">{faq.question}</h4>
                        {!faq.isPublished && <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded">Draft</span>}
                      </div>
                      <p className="text-gray-600">{faq.answer}</p>
                    </div>
                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setNewFaq(faq)} className="text-blue-500 hover:underline">Edit</button>
                      <button onClick={() => handleDeleteFaq(faq._id)} className="text-red-500 hover:underline">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardModal>
          )}



          {/* 💸 FINANCE MODAL */}
          {activeModal === "finance" && (
            <DashboardModal title="Finance & Payouts" onClose={() => setActiveModal(null)}>
              <FinanceDashboard />
            </DashboardModal>
          )}



          {/* ⚙️ SETTINGS MODAL */}
          {activeModal === "settings" && (
            <DashboardModal title="System Configuration" onClose={() => setActiveModal(null)}>
              <SystemSettings notify={notify} />
            </DashboardModal>
          )}

        </AnimatePresence>

      </main>

      {/* Rider Details Modal */}
      {selectedRider && (
        <div className="fixed inset-0 bg-riderBlack/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#18181b] rounded-2xl p-6 max-w-lg w-full border border-riderBlue/10 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Manage Rider</h2>
            <div className="space-y-6 mb-8">
              <div className="flex justify-between border-b border-riderBlue/10 pb-2"><span>Name</span><span className="font-bold">{selectedRider.name}</span></div>
              <div className="flex justify-between border-b border-riderBlue/10 pb-2"><span>Role</span><span className="font-bold capitalize">{selectedRider.status}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Profile Photo</p>
                <img
                  src={selectedRider.riderPicture || "https://placehold.co/400"}
                  alt="Rider"
                  className="w-full h-32 object-cover rounded-xl border border-riderBlue/20 bg-black/50"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-400">ID Document</p>
                <img
                  src={selectedRider.idPicture || "https://placehold.co/400"}
                  alt="ID"
                  className="w-full h-32 object-cover rounded-xl border border-riderBlue/20 bg-black/50"
                />
              </div>
            </div>

            <div className="mb-6 p-4 bg-riderDark/30 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">Location Interest</p>
              <p className="font-bold">{selectedRider.location ? "📍 Location Set" : "N/A"}</p>
              {selectedRider.location?.coordinates && (
                <p className="text-xs text-riderBlue mt-1">
                  Lat: {selectedRider.location.coordinates[1]}, Lng: {selectedRider.location.coordinates[0]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleApproveRider(selectedRider._id, "approved")} className="bg-green-600 hover:bg-green-700 text-riderLight py-3 rounded-xl font-bold">Approve</button>
              <button onClick={() => handleApproveRider(selectedRider._id, "rejected")} className="bg-red-600 hover:bg-red-700 text-riderLight py-3 rounded-xl font-bold">Reject</button>
            </div>
            <button onClick={() => setSelectedRider(null)} className="w-full mt-4 text-gray-600 hover:text-riderLight">Cancel</button>
          </motion.div>
        </div>
      )}

      {/* Vendor Details Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-riderBlack/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#18181b] rounded-2xl p-6 max-w-lg w-full border border-riderBlue/10 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Review Vendor</h2>
            <div className="space-y-6 mb-8">
              <div className="flex justify-between border-b border-riderBlue/10 pb-2"><span>Store Name</span><span className="font-bold">{selectedVendor.storeName}</span></div>
              <div className="flex justify-between border-b border-riderBlue/10 pb-2"><span>Status</span><span className="font-bold capitalize">{selectedVendor.status}</span></div>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-sm text-gray-400">Description</p>
              <div className="bg-riderDark/30 p-3 rounded-xl text-gray-300">{selectedVendor.description}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Logo</p>
                <img
                  src={selectedVendor.logo || "https://placehold.co/400"}
                  alt="Logo"
                  className="w-full h-32 object-cover rounded-xl border border-riderBlue/20 bg-black/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleApproveVendor(selectedVendor._id, "approved")} className="bg-green-600 hover:bg-green-700 text-riderLight py-3 rounded-xl font-bold">Approve</button>
              <button onClick={() => handleApproveVendor(selectedVendor._id, "rejected")} className="bg-red-600 hover:bg-red-700 text-riderLight py-3 rounded-xl font-bold">Reject</button>
            </div>
            <button onClick={() => setSelectedVendor(null)} className="w-full mt-4 text-gray-600 hover:text-riderLight">Cancel</button>
          </motion.div>
        </div>
      )}

      {/* Assignment Modal */}
      {selectedOrderForAssignment && (
        <div className="fixed inset-0 bg-riderBlack/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#18181b] rounded-2xl p-6 max-w-lg w-full border border-riderBlue/10 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4">Assign Rider</h2>
            <p className="text-gray-600 mb-6">Select a rider for Order #{selectedOrderForAssignment._id.slice(-6)}</p>

            <div className="space-y-3 max-h-60 overflow-y-auto mb-6 custom-scrollbar">
              {riders.filter(r => r.status === "approved" && r.isAvailable).length === 0 ? (
                <p className="text-yellow-500 bg-yellow-500/10 p-3 rounded">No online riders available.</p>
              ) : (
                riders.filter(r => r.status === "approved" && r.isAvailable).map(rider => (
                  <button
                    key={rider._id}
                    onClick={() => handleAssignOrder(selectedOrderForAssignment._id, rider._id)}
                    className="w-full flex justify-between items-center p-3 rounded-xl bg-riderDark/50 hover:bg-riderBlue/20 hover:border-riderBlue border border-transparent transition-all"
                  >
                    <div className="text-left">
                      <p className="font-bold">{rider.name}</p>
                      <p className="text-xs text-gray-600">{rider.phone}</p>
                    </div>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Online</span>
                  </button>
                ))
              )}

              {riders.filter(r => r.status === "approved" && !r.isAvailable).length > 0 && (
                <div className="mt-4 pt-4 border-t border-riderBlue/10">
                  <p className="text-xs text-gray-500 mb-2 uppercase font-bold">Offline Riders</p>
                  {riders.filter(r => r.status === "approved" && !r.isAvailable).map(rider => (
                    <div key={rider._id} className="flex justify-between items-center p-3 opacity-50">
                      <div className="text-left">
                        <p className="font-bold">{rider.name}</p>
                        <p className="text-xs text-gray-600">{rider.phone}</p>
                      </div>
                      <span className="text-xs bg-gray-500/20 text-gray-600 px-2 py-1 rounded">Offline</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => setSelectedOrderForAssignment(null)} className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold">Close</button>
          </motion.div>
        </div>
      )}

    </div>
  );
}

/* HELPER COMPONENTS */
function DashboardModal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-riderBlack/90 flex items-center justify-center p-4 z-40" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-riderBlack/90 backdrop-blur-2xl rounded-2xl w-full max-w-5xl h-[85vh] border border-riderBlue/20 shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* Header */}
        <div className="p-6 border-b border-riderBlue/10 flex justify-between items-center sticky top-0 bg-riderDark/80 backdrop-blur-md rounded-t-2xl z-10">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-riderDark/50 rounded-lg transition-colors">
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>
      </motion.div>
    </div>
  )
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-full transition-all duration-300 font-bold ${active ? "bg-gradient-to-r from-riderBlue to-riderMaroon text-white shadow-lg shadow-riderBlue/30" : "text-gray-600 hover:bg-riderBlue/10 hover:text-riderBlue"}`}>
      <span className="text-lg">{icon}</span>
      <span className="hidden lg:block">{label}</span>
    </button>
  )
}

function StatCard({ title, value, icon, onClick, color }) {
  return (
    <div
      onClick={onClick}
      className={`relative p-6 rounded-[2rem] border border-white/10 transition-all group overflow-hidden shadow-lg
            ${color ? color : "bg-white"}
            ${onClick ? "cursor-pointer hover:shadow-2xl hover:-translate-y-1 active:scale-95" : ""}
        `}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

      <div className="flex justify-between items-start mb-4 relative z-10">
        <h3 className="text-white/80 font-bold tracking-wide">{title}</h3>
        <span className="p-3 rounded-xl bg-white/20 backdrop-blur-sm shadow-sm">{icon}</span>
      </div>
      <p className="text-4xl font-black text-white relative z-10">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = { approved: "bg-green-500/20 text-green-400", pending: "bg-yellow-500/20 text-yellow-400", rejected: "bg-red-500/20 text-red-400" };
  return <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${colors[status] || "bg-gray-500/20 text-gray-600"}`}>{status}</span>;
}
