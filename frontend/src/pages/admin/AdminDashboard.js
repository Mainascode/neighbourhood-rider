import { useEffect, useState, useCallback } from "react";
import { useNotify } from "../../context/NotificationContext";
import { socket } from "../../lib/socket.js";
import { FaBoxOpen, FaMoneyBillWave, FaMotorcycle, FaQuestionCircle, FaComments, FaBell } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminDashboard() {
  const [activeModal, setActiveModal] = useState(null); // changed from activeTab
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [inquiries, setInquiries] = useState([]); // In future this would fetch from backend history

  const [stats, setStats] = useState({
    totalOrders: 0,
    unpaidOrders: 0,
    activeRiders: 0,
    totalRevenue: 0,
  });

  const [selectedRider, setSelectedRider] = useState(null);
  const [selectedOrderForAssignment, setSelectedOrderForAssignment] = useState(null);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "", isPublished: true });
  const { notify } = useNotify();

  /* 🛠️ Actions */
  const handleAssignOrder = async (orderId, riderId) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/orders/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId, riderId })
      });

      if (res.ok) {
        notify("Order assigned successfully!", "success");
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: "assigned" } : o));
        setSelectedOrderForAssignment(null);
      } else {
        notify("Failed to assign order", "error");
      }
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
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin/dashboard`, { credentials: "include" });
      const data = await res.json();
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
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin/riders`, { credentials: "include" });
      const data = await res.json();
      setRiders(data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin/orders`, { credentials: "include" });
      const data = await res.json();
      setOrders(data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchFaqs = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/faqs/all`, { credentials: "include" }); // Fetch ALL for admin
      const data = await res.json();
      setFaqs(data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchInquiries = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin/inquiries`, { credentials: "include" });
      const data = await res.json();
      setInquiries(data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetchDashboard(); // Always fetch dashboard stats
    if (activeModal === "riders") fetchRiders();
    if (activeModal === "orders") fetchOrders();
    if (activeModal === "faqs") fetchFaqs();
    if (activeModal === "inquiries") fetchInquiries();
  }, [activeModal, fetchDashboard, fetchRiders, fetchOrders, fetchFaqs, fetchInquiries]);


  /* 🛠️ Actions */
  const handleApproveRider = async (id, status) => {
    const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin/riders/${id}/approve`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status })
    });
    if (res.ok) {
      notify(`Rider ${status}`, "success");
      fetchRiders();
      setSelectedRider(null);
    }
  };

  const handleAddFaq = async (e) => {
    e.preventDefault();
    const url = newFaq._id
      ? `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/faqs/${newFaq._id}`
      : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/faqs`;

    const method = newFaq._id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(newFaq)
    });

    if (res.ok) {
      notify(newFaq._id ? "FAQ Updated" : "FAQ Added", "success");
      setNewFaq({ question: "", answer: "", isPublished: true });
      fetchFaqs();
    }
  };

  const handleDeleteFaq = async (id) => {
    const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/faqs/${id}`, {
      method: "DELETE", credentials: "include"
    });
    if (res.ok) {
      notify("FAQ Deleted", "info");
      setFaqs(prev => prev.filter(f => f._id !== id));
    }
  }


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
          <NavItem icon={<FaMoneyBillWave />} label="Live Orders" active={activeModal === "orders"} onClick={() => setActiveModal("orders")} />
          <NavItem icon={<FaQuestionCircle />} label="FAQs" active={activeModal === "faqs"} onClick={() => setActiveModal("faqs")} />
          <NavItem icon={<FaComments />} label="Inquiries" active={activeModal === "inquiries"} onClick={() => setActiveModal("inquiries")} />
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
            <div className="relative cursor-pointer hover:text-riderBlue transition-colors">
              <FaBell className="text-xl" />
              {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-riderMaroon to-pink-600 border-2 border-riderBlue/10"></div>
          </div>
        </header>

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
              title="Active Riders"
              value={stats.activeRiders}
              icon={<FaMotorcycle className="text-white text-2xl" />}
              color="bg-gradient-to-br from-blue-400 to-indigo-600"
              onClick={() => setActiveModal("riders")}
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
                        <button onClick={() => setSelectedRider(r)} className="text-blue-400 hover:text-blue-300 font-medium">Manage</button>
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
                        <p className={`text-xs capitalize font-bold ${order.status === "pending" ? "text-yellow-500" : "text-green-500"}`}>{order.status}</p>
                      </div>

                      {order.status === "pending" && (
                        <button
                          onClick={() => setSelectedOrderForAssignment(order)}
                          className="bg-riderBlue hover:bg-blue-600 text-riderLight px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                        >
                          Assign
                        </button>
                      )}
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

          {/* 💬 INQUIRIES MODAL */}
          {activeModal === "inquiries" && (
            <DashboardModal title="Inquiries" onClose={() => setActiveModal(null)}>
              <div className="space-y-4 max-w-4xl">
                {inquiries.length === 0 ? (
                  <div className="text-center py-20 text-gray-500 bg-riderDark/40 backdrop-blur-md rounded-2xl border border-riderBlue/10">
                    <FaComments className="text-5xl mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-bold">Inquiries Log</h3>
                    <p>No inquiries found.</p>
                  </div>
                ) : (
                  inquiries.map(inq => (
                    <div key={inq._id} className="bg-riderDark/40 backdrop-blur-md p-6 rounded-2xl border border-riderBlue/10 hover:border-riderBlue/30 transition-colors flex flex-col md:flex-row gap-4 justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${inq.status === "unread" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                            {inq.status}
                          </span>
                          <span className="text-gray-600 text-xs">{new Date(inq.timestamp).toLocaleString()}</span>
                        </div>
                        <h4 className="font-bold text-lg text-riderLight mb-1">{inq.subject || "Inquiry"}</h4>
                        <p className="text-sm text-riderBlue mb-3">{inq.email || "No Email"}</p>

                        {inq.message ? (
                          <p className="text-gray-700 bg-riderDark/50 p-3 rounded-lg">{inq.message}</p>
                        ) : (
                          <div className="text-gray-700 bg-riderDark/50 p-3 rounded-lg">
                            <p><strong>Items:</strong> {inq.items?.join(", ")}</p>
                            <p><strong>Location:</strong> {inq.location}</p>
                          </div>
                        )}
                      </div>
                      {/* Actions (Future: Reply via Email, Mark as Read) */}
                      <div className="flex items-start">
                        {/* Placeholder for future actions */}
                      </div>
                    </div>
                  ))
                )}
              </div>
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

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleApproveRider(selectedRider._id, "approved")} className="bg-green-600 hover:bg-green-700 text-riderLight py-3 rounded-xl font-bold">Approve</button>
              <button onClick={() => handleApproveRider(selectedRider._id, "rejected")} className="bg-red-600 hover:bg-red-700 text-riderLight py-3 rounded-xl font-bold">Reject</button>
            </div>
            <button onClick={() => setSelectedRider(null)} className="w-full mt-4 text-gray-600 hover:text-riderLight">Cancel</button>
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
