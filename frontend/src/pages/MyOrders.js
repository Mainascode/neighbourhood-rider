import { useEffect, useMemo, useState } from "react";
import { apiFetch, apiGetCached, invalidateCache } from "../lib/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { FaBoxOpen, FaClock, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { Link } from "react-router-dom";

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

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [receiptOrder, setReceiptOrder] = useState(null);

  useEffect(() => {
    let intervalId;

    const fetchOrders = async () => {
      try {
        const data = await apiGetCached("/api/orders/my", { ttlMs: 3000 });
        const rows = Array.isArray(data) ? data : [];
        setOrders(rows);
      } catch (error) {
        console.error("Failed to fetch orders", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    intervalId = window.setInterval(fetchOrders, 7000);

    return () => window.clearInterval(intervalId);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = normalizeStatus(order.status);
      if (activeTab === "pending") return ["PAYMENT_PENDING", "PROCESSING", "ON_THE_WAY"].includes(status);
      if (activeTab === "completed") return status === "DELIVERED";
      if (activeTab === "cancelled") return ["CANCELLED", "REFUNDED"].includes(status);
      return true;
    });
  }, [activeTab, orders]);

  const handleReceiptConfirm = async (orderId) => {
    try {
      await apiFetch("/api/orders/confirm-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      invalidateCache("/api/orders/my");
      setOrders((prev) =>
        prev.map((order) => (order._id === orderId ? { ...order, isReceived: true } : order))
      );
    } catch (error) {
      console.error("Failed to confirm receipt", error);
      window.alert("Failed to confirm receipt.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-riderLight font-sans">
      <Navbar />

      <main className="flex-grow pt-20 md:pt-24 pb-20 px-3 md:px-6 safe-pad-bottom">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-riderBlue/20 rounded-2xl flex items-center justify-center text-riderBlue text-2xl shadow-lg border border-riderBlue/30 shrink-0">
              <FaBoxOpen />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-riderLight">My Orders</h1>
              <p className="text-sm md:text-base text-gray-600">Follow payment, processing, delivery, and receipts.</p>
            </div>
          </div>

          <div className="flex gap-2 mb-8 bg-riderBlack/90 backdrop-blur-md p-1 rounded-xl shadow-lg border border-riderBlue/10 w-full overflow-x-auto">
            <TabButton
              active={activeTab === "pending"}
              onClick={() => setActiveTab("pending")}
              label="Pending"
              icon={<FaClock />}
              count={orders.filter((order) => ["PAYMENT_PENDING", "PROCESSING", "ON_THE_WAY"].includes(normalizeStatus(order.status))).length}
            />
            <TabButton
              active={activeTab === "completed"}
              onClick={() => setActiveTab("completed")}
              label="Completed"
              icon={<FaCheckCircle />}
              count={orders.filter((order) => normalizeStatus(order.status) === "DELIVERED").length}
            />
            <TabButton
              active={activeTab === "cancelled"}
              onClick={() => setActiveTab("cancelled")}
              label="Cancelled"
              icon={<FaTimesCircle />}
              count={orders.filter((order) => ["CANCELLED", "REFUNDED"].includes(normalizeStatus(order.status))).length}
            />
            <TabButton
              active={activeTab === "history"}
              onClick={() => setActiveTab("history")}
              label="History"
              icon={<FaBoxOpen />}
              count={orders.length}
            />
          </div>

          {loading ? (
            <MyOrdersSkeleton />
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-20 bg-riderBlack/90 backdrop-blur-md rounded-2xl border border-dashed border-riderBlue/10">
              <FaBoxOpen className="text-5xl mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-600">No {activeTab} orders found</h3>
              <Link to="/order" className="text-riderBlue hover:text-riderLight mt-2 inline-block transition-colors">
                Place a new order
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const status = normalizeStatus(order.status);
                return (
                  <div key={order._id} className="bg-riderDark/90 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-lg border border-riderBlue/10 flex flex-col lg:flex-row justify-between gap-5">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          ["CANCELLED", "REFUNDED"].includes(status)
                            ? "bg-red-500/20 text-red-400"
                            : status === "DELIVERED"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-blue-500/20 text-blue-400"
                        }`}>
                          {status.replaceAll("_", " ")}
                        </span>
                        <span className="text-gray-600 text-xs">#{order._id.slice(-6).toUpperCase()}</span>
                        <span className="text-gray-600 text-xs">• {new Date(order.createdAt).toLocaleString()}</span>
                      </div>
                      <h3 className="font-bold text-lg mb-1 text-riderLight">{order.items?.length || 0} items</h3>
                      <p className="text-sm text-gray-600">{order.dropoff?.address || order.pickup?.address || "Ruaka - Gathigi Estate"}</p>
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-xl bg-black/10 px-3 py-3">
                          <div className="text-gray-500">Items total</div>
                          <div className="font-bold text-riderLight">KES {order.goodsTotal || 0}</div>
                        </div>
                        <div className="rounded-xl bg-black/10 px-3 py-3">
                          <div className="text-gray-500">Delivery fee</div>
                          <div className="font-bold text-riderLight">KES {order.deliveryFee || 0}</div>
                        </div>
                        <div className="rounded-xl bg-black/10 px-3 py-3">
                          <div className="text-gray-500">Total paid</div>
                          <div className="font-bold text-riderMaroon">KES {order.amount || 0}</div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:w-64 flex flex-col gap-3">
                      <button
                        onClick={() => setReceiptOrder(order)}
                        className="bg-gray-800 text-white px-4 py-3 min-h-[46px] rounded-xl font-bold hover:bg-gray-700 transition-colors"
                      >
                        View Receipt
                      </button>

                      {status === "DELIVERED" && !order.isReceived && (
                        <button
                          onClick={() => handleReceiptConfirm(order._id)}
                          className="bg-green-600 text-white px-4 py-3 min-h-[46px] rounded-xl font-bold hover:bg-green-700 transition-colors"
                        >
                          Confirm Receipt
                        </button>
                      )}

                      {order.isReceived && (
                        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 font-semibold">
                          Receipt confirmed
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {receiptOrder && (
        <div className="fixed inset-0 bg-riderBlack/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-4 md:p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Receipt</h3>
              <button onClick={() => setReceiptOrder(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <div className="text-sm text-gray-700 space-y-3">
              <div className="flex justify-between">
                <span className="font-semibold">Order ID</span>
                <span className="font-mono">{receiptOrder._id}</span>
              </div>
              <div>
                <span className="font-semibold">Items</span>
                <ul className="mt-1 text-xs text-gray-600 space-y-1">
                  {receiptOrder.items?.map((item, index) => (
                    <li key={`${item.name}-${index}`}>
                      {item.name || "Item"} x{item.quantity || 1} - KES {(item.price || 0) * (item.quantity || 1)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Items total</span>
                <span>KES {receiptOrder.goodsTotal || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Delivery fee</span>
                <span>KES {receiptOrder.deliveryFee || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Total paid</span>
                <span className="font-bold">KES {receiptOrder.amount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Status</span>
                <span>{normalizeStatus(receiptOrder.status).replaceAll("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Timestamp</span>
                <span className="text-right max-w-[55%]">{new Date(receiptOrder.updatedAt || receiptOrder.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label, icon, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
        active ? "bg-riderBlue text-riderLight shadow-md" : "text-gray-600 hover:bg-riderDark/50 hover:text-riderLight"
      }`}
    >
      {icon}
      {label}
      {count > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-riderBlue/20 text-riderLight" : "bg-riderDark/20 text-gray-600"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function MyOrdersSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((id) => (
        <div key={id} className="bg-riderDark/90 backdrop-blur-md p-6 rounded-2xl border border-riderBlue/10">
          <div className="h-4 w-44 bg-riderBlack/40 rounded mb-3"></div>
          <div className="h-6 w-32 bg-riderBlack/40 rounded mb-2"></div>
          <div className="h-4 w-56 bg-riderBlack/30 rounded"></div>
        </div>
      ))}
    </div>
  );
}
