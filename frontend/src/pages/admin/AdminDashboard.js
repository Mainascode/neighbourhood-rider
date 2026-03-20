import { useEffect, useMemo, useState, useCallback } from "react";
import { apiFetch, apiGetCached, invalidateCache } from "../../lib/api";
import { useNotify } from "../../context/NotificationContext";
import { FaBoxOpen, FaMoneyBillWave, FaClock, FaCog, FaUsers, FaClipboardList } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import SystemSettings from "./SystemSettings";

const STATUS_OPTIONS = [
  { value: "SHOPPING", label: "Shopping" },
  { value: "DELIVERING", label: "Delivering" },
  { value: "DELIVERED", label: "Delivered" },
];

function normalizeStatus(status) {
  const raw = String(status || "").toUpperCase();
  if (raw === "DRAFT") return "DRAFT";
  if (["AWAITING_CONFIRMATION", "PAYMENT_PENDING", "PAYMENT_CONFIRMED"].includes(raw)) return "AWAITING_CONFIRMATION";
  if (raw === "PAID") return "PAID";
  if (["SHOPPING", "PROCESSING", "VENDOR_ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "PENDING_RIDER", "RIDER_ASSIGNED"].includes(raw)) return "SHOPPING";
  if (["DELIVERING", "ON_THE_WAY"].includes(raw)) return "DELIVERING";
  if (raw === "DELIVERED") return "DELIVERED";
  if (raw === "REFUNDED") return "REFUNDED";
  if (raw === "CANCELLED") return "CANCELLED";
  return "DRAFT";
}

function computeDeliveryPreview(isRaining) {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 9) return isRaining ? 120 : 100;
  if (hour >= 9 && hour < 17) return isRaining ? 70 : 50;
  if (hour >= 18 && hour < 22) return isRaining ? 120 : 100;
  return isRaining ? 120 : 100;
}

function seedReviewItems(order) {
  const sourceItems = Array.isArray(order.finalItems) && order.finalItems.length > 0
    ? order.finalItems
    : Array.isArray(order.items)
      ? order.items
      : [];

  return sourceItems.map((item, index) => ({
    _id: item._id || `${order._id}-${index}`,
    name: item.name || "Item",
    quantity: Math.max(1, Number(item.quantity) || 1),
    finalPrice: Number(item.finalPrice ?? item.price ?? item.userEstimatedPrice) || 0,
    userEstimatedPrice: Number(item.userEstimatedPrice ?? item.price) || 0,
    note: item.note || "",
    image: item.image || "",
    category: item.category || "",
  }));
}

export default function AdminDashboard() {
  const [activeModal, setActiveModal] = useState(null);
  const [selectedStatKey, setSelectedStatKey] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    draftOrders: 0,
    awaitingConfirmationOrders: 0,
    unpaidOrders: 0,
    paidOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    isRaining: false,
    details: {},
  });
  const [notifications, setNotifications] = useState([]);
  const [reviewEdits, setReviewEdits] = useState({});
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

  useEffect(() => {
    setReviewEdits((prev) => {
      const next = { ...prev };
      for (const order of orders) {
        const status = normalizeStatus(order.status);
        if ((status === "DRAFT" || status === "AWAITING_CONFIRMATION") && !next[order._id]) {
          next[order._id] = seedReviewItems(order);
        }
      }
      return next;
    });
  }, [orders]);

  const deliveryPreview = computeDeliveryPreview(stats.isRaining);

  const orderedRows = useMemo(() => {
    const priority = { DRAFT: 0, AWAITING_CONFIRMATION: 1, PAID: 2, SHOPPING: 3, DELIVERING: 4, DELIVERED: 5, CANCELLED: 6, REFUNDED: 7 };
    return [...orders].sort((a, b) => {
      const pa = priority[normalizeStatus(a.status)] ?? 99;
      const pb = priority[normalizeStatus(b.status)] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [orders]);

  const statDetailMap = useMemo(() => ({
    draftOrders: {
      title: "Draft Requests",
      subtitle: "Open request details before review and quotation.",
      items: orderedRows
        .filter((order) => normalizeStatus(order.status) === "DRAFT")
        .map((order) => ({
          id: order._id,
          customerName: order.userId?.name || "Customer",
          customerEmail: order.userId?.email || "",
          estimatedTotal: Number(order.estimatedTotal || 0),
          itemsCount: Array.isArray(order.items) ? order.items.length : 0,
          customerNote: order.customerNote || "",
          createdAt: order.createdAt,
        })),
    },
    awaitingConfirmationOrders: stats.details?.awaitingConfirmationOrders || {
      title: "Awaiting Confirmation",
      subtitle: "Orders waiting for the customer to confirm and pay.",
      items: orderedRows
        .filter((order) => normalizeStatus(order.status) === "AWAITING_CONFIRMATION")
        .map((order) => ({
          id: order._id,
          customerName: order.userId?.name || "Customer",
          customerEmail: order.userId?.email || "",
          finalTotal: Number(order.finalTotal || order.amount || 0),
          deliveryFee: Number(order.deliveryFee || 0),
          updatedAt: order.updatedAt,
        })),
    },
    paidOrders: {
      title: "Paid Orders",
      subtitle: "Orders already paid and ready for the next fulfilment step.",
      items: orderedRows
        .filter((order) => Boolean(order.paid) || normalizeStatus(order.status) === "PAID")
        .map((order) => ({
          id: order._id,
          customerName: order.userId?.name || "Customer",
          customerEmail: order.userId?.email || "",
          status: normalizeStatus(order.status),
          finalTotal: Number(order.finalTotal || order.amount || 0),
          updatedAt: order.updatedAt,
        })),
    },
    processingOrders: {
      title: "Active Fulfilment",
      subtitle: "Orders currently being prepared, assigned, or delivered.",
      items: orderedRows
        .filter((order) => ["SHOPPING", "DELIVERING"].includes(normalizeStatus(order.status)))
        .map((order) => ({
          id: order._id,
          customerName: order.userId?.name || "Customer",
          customerEmail: order.userId?.email || "",
          status: normalizeStatus(order.status),
          finalTotal: Number(order.finalTotal || order.amount || 0),
          paid: Boolean(order.paid),
          updatedAt: order.updatedAt,
        })),
    },
    customers: stats.details?.customers || { title: "Customers", subtitle: "Customer details", items: [] },
    revenue: {
      title: "Revenue Overview",
      subtitle: "Quick view of fulfilled and paid orders contributing to revenue.",
      items: orderedRows
        .filter((order) => Boolean(order.paid))
        .map((order) => ({
          id: order._id,
          customerName: order.userId?.name || "Customer",
          status: normalizeStatus(order.status),
          revenueAmount: Number(order.finalTotal || order.amount || 0),
          paidAt: order.paidAt || order.updatedAt,
        })),
    },
  }), [orderedRows, stats.details]);

  const selectedStatDetails = selectedStatKey ? statDetailMap[selectedStatKey] || null : null;

  const updateReviewItem = (orderId, itemId, field, value) => {
    setReviewEdits((prev) => ({
      ...prev,
      [orderId]: (prev[orderId] || []).map((item) =>
        item._id === itemId
          ? {
              ...item,
              [field]: field === "quantity" || field === "finalPrice"
                ? Math.max(0, Number(value) || 0)
                : value,
            }
          : item
      ),
    }));
  };

  const removeReviewItem = (orderId, itemId) => {
    setReviewEdits((prev) => ({
      ...prev,
      [orderId]: (prev[orderId] || []).filter((item) => item._id !== itemId),
    }));
  };

  const sendFinalPrice = async (orderId) => {
    try {
      const finalItems = (reviewEdits[orderId] || []).map((item) => ({
        _id: item._id,
        name: item.name,
        quantity: Math.max(1, Number(item.quantity) || 1),
        finalPrice: Math.max(0, Number(item.finalPrice) || 0),
        userEstimatedPrice: Math.max(0, Number(item.userEstimatedPrice) || 0),
        note: item.note || "",
        image: item.image || "",
        category: item.category || "",
      }));

      const updatedOrder = await apiFetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review",
          finalItems,
        }),
      });

      setOrders((prev) => prev.map((order) => (order._id === orderId ? updatedOrder : order)));
      invalidateCache("/api/admin/dashboard");
      addNotification("Final price sent to customer.", "success");
      fetchDashboard();
    } catch (error) {
      console.error(error);
      addNotification(error.message || "Failed to send final price.", "error");
    }
  };

  const updateFulfilmentStatus = async (orderId, status) => {
    try {
      const updatedOrder = await apiFetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      setOrders((prev) => prev.map((order) => (order._id === orderId ? updatedOrder : order)));
      invalidateCache("/api/admin/dashboard");
      addNotification(`Order moved to ${status.replaceAll("_", " ")}.`, "success");
      fetchDashboard();
    } catch (error) {
      console.error(error);
      addNotification(error.message || "Failed to update order status.", "error");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-transparent text-riderLight font-sans selection:bg-riderMaroon selection:text-riderLight overflow-hidden">
      <aside className="w-full lg:w-64 bg-white/60 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-riderBlue/10 flex flex-col items-stretch lg:items-start py-4 lg:py-8 transition-all z-20 shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-b from-riderBlue/5 to-riderMaroon/5 pointer-events-none"></div>
        <div className="mb-4 lg:mb-12 px-4 lg:px-6 flex items-center justify-between lg:justify-start gap-3 relative z-10">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-riderBlue to-riderMaroon shadow-lg shadow-riderBlue/20"></div>
          <span className="text-lg lg:text-xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-riderBlue to-riderMaroon">
            Rider<span className="font-black">Dashboard</span>
          </span>
        </div>

        <nav className="w-full flex lg:block gap-2 overflow-x-auto px-3 pb-1 lg:space-y-3 relative z-10">
          <NavItem icon={<FaBoxOpen />} label="Overview" active={activeModal === null} onClick={() => setActiveModal(null)} />
          <NavItem icon={<FaClipboardList />} label="Requests" active={activeModal === "orders"} onClick={() => setActiveModal("orders")} />
          <NavItem icon={<FaCog />} label="Weather" active={activeModal === "settings"} onClick={() => setActiveModal("settings")} />
        </nav>
      </aside>

      <main className="flex-1 relative overflow-y-auto lg:h-screen p-3 md:p-4 lg:p-10 safe-pad-bottom">
        <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Single Rider Assisted Shopping</h1>
            <p className="text-gray-600 text-sm mt-1">Review lists, send final prices, track payment, and fulfil orders from one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-full text-sm font-bold ${stats.isRaining ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
              {stats.isRaining ? "Rainy pricing active" : "Sunny pricing active"}
            </div>
          </div>
        </header>

        <div className="fixed top-20 right-3 left-3 lg:left-auto lg:top-10 lg:right-10 flex flex-col gap-2 z-50 pointer-events-none">
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
            <StatCard title="Draft Requests" value={stats.draftOrders || 0} detailKey="draftOrders" onOpenDetails={setSelectedStatKey} icon={<FaClipboardList className="text-white text-2xl" />} color="bg-gradient-to-br from-purple-400 to-violet-600" />
            <StatCard title="Awaiting Confirmation" value={stats.awaitingConfirmationOrders || 0} detailKey="awaitingConfirmationOrders" onOpenDetails={setSelectedStatKey} icon={<FaClock className="text-white text-2xl" />} color="bg-gradient-to-br from-pink-400 to-rose-600" />
            <StatCard title="Paid Orders" value={stats.paidOrders || 0} detailKey="paidOrders" onOpenDetails={setSelectedStatKey} icon={<FaMoneyBillWave className="text-white text-2xl" />} color="bg-gradient-to-br from-blue-400 to-indigo-600" />
            <StatCard title="Active Fulfilment" value={stats.processingOrders || 0} detailKey="processingOrders" onOpenDetails={setSelectedStatKey} icon={<FaBoxOpen className="text-white text-2xl" />} color="bg-gradient-to-br from-cyan-400 to-sky-600" />
            <StatCard title="Customers" value={stats.totalUsers || 0} detailKey="customers" onOpenDetails={setSelectedStatKey} icon={<FaUsers className="text-white text-2xl" />} color="bg-gradient-to-br from-orange-400 to-red-500" />
            <StatCard title="Revenue" value={`KES ${stats.totalRevenue || 0}`} detailKey="revenue" onOpenDetails={setSelectedStatKey} icon={<FaMoneyBillWave className="text-white text-2xl" />} color="bg-gradient-to-br from-green-400 to-emerald-600" />
          </div>

          {(activeModal === null || activeModal === "orders") && (
            <section className="rounded-[1.75rem] md:rounded-3xl bg-white/70 backdrop-blur-md border border-riderBlue/10 p-4 md:p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Shopping Requests</h2>
                  <p className="text-sm text-gray-600">Draft requests can be reviewed and quoted here. Delivery fee preview: KES {deliveryPreview}.</p>
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
                {orderedRows.map((order) => {
                  const status = normalizeStatus(order.status);
                  const editableItems = reviewEdits[order._id] || [];
                  const quoteItemsTotal = editableItems.reduce((sum, item) => {
                    return sum + (Number(item.finalPrice || 0) * Number(item.quantity || 1));
                  }, 0);
                  const quotePreviewTotal = quoteItemsTotal + deliveryPreview;

                  return (
                    <div key={order._id} className="rounded-2xl border border-riderBlue/10 bg-white/80 p-4 md:p-5 shadow-sm">
                      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-riderBlue/10 text-riderBlue">
                              {status.replaceAll("_", " ")}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              order.paid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                            }`}>
                              {order.paid ? "Paid" : "Not paid"}
                            </span>
                            <span className="text-xs text-gray-500">#{order._id.slice(-6).toUpperCase()}</span>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <h3 className="font-bold text-lg">{order.userId?.name || "Customer"}</h3>
                              <p className="text-sm text-gray-600">{order.userId?.email || "No email"}</p>
                              <p className="text-sm text-gray-600 mt-1">Estimated total: KES {order.estimatedTotal || 0}</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                              <InfoPill label="Items" value={`KES ${order.goodsTotal || 0}`} />
                              <InfoPill label="Delivery" value={`KES ${order.deliveryFee || 0}`} />
                              <InfoPill label="Final" value={`KES ${order.finalTotal || order.amount || 0}`} />
                            </div>
                          </div>

                          {(status === "DRAFT" || status === "AWAITING_CONFIRMATION") ? (
                            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-3">
                              <div className="text-sm font-bold text-riderLight">Rider Review</div>
                              {order.customerNote ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                                  <div className="font-bold mb-1">Extra request note</div>
                                  <div className="whitespace-pre-wrap">{order.customerNote}</div>
                                </div>
                              ) : null}
                              {editableItems.map((item) => (
                                <div key={item._id} className="rounded-xl border border-gray-200 bg-white p-3">
                                  <div className="flex justify-between gap-3 items-start">
                                    <div className="flex-1">
                                      <div className="font-bold text-riderLight">{item.name}</div>
                                      {item.note ? <div className="text-xs text-gray-500 mt-1">Note: {item.note}</div> : null}
                                      <div className="grid grid-cols-2 gap-3 mt-3">
                                        <div>
                                          <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1">Qty</label>
                                          <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(event) => updateReviewItem(order._id, item._id, "quantity", event.target.value)}
                                            className="w-full rounded-xl border border-gray-200 px-3 py-2"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1">Final Price</label>
                                          <input
                                            type="number"
                                            min="0"
                                            value={item.finalPrice}
                                            onChange={(event) => updateReviewItem(order._id, item._id, "finalPrice", event.target.value)}
                                            className="w-full rounded-xl border border-gray-200 px-3 py-2"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => removeReviewItem(order._id, item._id)}
                                      className="text-xs font-bold text-red-500"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))}

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                <InfoPill label="Items Total" value={`KES ${quoteItemsTotal}`} />
                                <InfoPill label="Delivery Fee" value={`KES ${deliveryPreview}`} />
                                <InfoPill label="Quote Total" value={`KES ${quotePreviewTotal}`} />
                              </div>

                              <button
                                onClick={() => sendFinalPrice(order._id)}
                                className="w-full min-h-[46px] px-4 py-3 rounded-xl font-bold bg-riderMaroon text-white hover:bg-rose-700"
                              >
                                {status === "DRAFT" ? "Send Final Price" : "Update Final Price"}
                              </button>
                            </div>
                          ) : (
                            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                              <div className="text-sm font-bold text-riderLight mb-2">Final Items</div>
                              <ul className="space-y-2 text-sm text-gray-700">
                                {(order.finalItems?.length ? order.finalItems : order.items || []).map((item, index) => (
                                  <li key={`${order._id}-${index}`} className="flex justify-between gap-4">
                                    <span>{item.name || "Item"} x{item.quantity || 1}</span>
                                    <span className="font-bold">KES {(Number(item.finalPrice ?? item.price ?? item.userEstimatedPrice) || 0) * (Number(item.quantity) || 1)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="xl:w-64 grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
                          {status === "PAID" || status === "SHOPPING" || status === "DELIVERING" ? (
                            STATUS_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => updateFulfilmentStatus(order._id, option.value)}
                                disabled={!order.paid || status === option.value}
                                className="w-full min-h-[46px] px-4 py-3 rounded-xl font-bold bg-riderBlue text-white hover:bg-blue-600 disabled:opacity-40"
                              >
                                Mark {option.label}
                              </button>
                            ))
                          ) : status === "AWAITING_CONFIRMATION" ? (
                            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                              Waiting for customer confirmation and payment.
                            </div>
                          ) : (
                            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                              No fulfilment action needed.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {orderedRows.length === 0 && (
                  <div className="text-center py-16 text-gray-500">
                    No orders found.
                  </div>
                )}
              </div>
            </section>
          )}

          {activeModal === "settings" && (
            <section className="rounded-[1.75rem] md:rounded-3xl bg-white/70 backdrop-blur-md border border-riderBlue/10 p-4 md:p-6 shadow-xl">
              <SystemSettings notify={notify} />
            </section>
          )}
        </motion.div>

        <AnimatePresence>
          {selectedStatDetails ? (
            <DetailsModal
              title={selectedStatDetails.title}
              subtitle={selectedStatDetails.subtitle}
              items={selectedStatDetails.items || []}
              onClose={() => setSelectedStatKey(null)}
            />
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`min-w-fit lg:min-w-0 w-auto lg:w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold whitespace-nowrap ${
        active ? "bg-riderBlue text-white shadow-lg" : "text-gray-600 hover:bg-white/70 hover:text-riderLight"
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function StatCard({ title, value, icon, color, detailKey, onOpenDetails }) {
  return (
    <div className="rounded-3xl bg-white/70 backdrop-blur-md border border-riderBlue/10 p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-600 font-semibold">{title}</p>
          <h3 className="text-3xl font-extrabold mt-2">{value}</h3>
        </div>
        <button
          type="button"
          onClick={() => onOpenDetails?.(detailKey)}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-riderBlue/20 ${color}`}
          aria-label={`Open ${title} details`}
          title={`Open ${title} details`}
        >
          {icon}
        </button>
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

function DetailsModal({ title, subtitle, items, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-slate-950/45 backdrop-blur-sm p-4 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-[2rem] bg-white shadow-2xl border border-riderBlue/10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-200">
          <div>
            <h3 className="text-2xl font-extrabold text-riderLight">{title || "Details"}</h3>
            <p className="text-sm text-gray-600 mt-1">{subtitle || "Full details for this dashboard card."}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-96px)] px-6 py-5 space-y-3 bg-slate-50/70">
          {items.length ? items.map((item, index) => (
            <div key={item.id || index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {Object.entries(item).map(([key, value]) => (
                <div key={key} className="grid grid-cols-[140px_1fr] gap-3 py-1.5 text-sm">
                  <div className="font-bold text-slate-500">{prettifyKey(key)}</div>
                  <div className="text-slate-800 break-words">{formatDetailValue(value)}</div>
                </div>
              ))}
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-gray-500">
              No details available for this card yet.
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function prettifyKey(key) {
  return String(key || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function formatDetailValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toLocaleString();
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
