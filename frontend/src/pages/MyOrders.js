import { useEffect, useState, useCallback } from "react";
import { API_URL } from "../lib/config";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { FaBoxOpen, FaClock, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { Link } from "react-router-dom";
import { socket } from "../lib/socket";
import LiveMap from "../components/LiveMap";

export default function MyOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("pending");

    // Tracking State
    const [trackingOrder, setTrackingOrder] = useState(null);
    const [riderLocation, setRiderLocation] = useState(null);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/orders/my`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                credentials: "include"
            });
            if (res.ok) {
                const data = await res.json();
                setOrders(data);

                // ✨ Auto-Open Map for Active Orders
                const activeOrder = data.find(o => ["assigned", "delivering"].includes(o.status));
                if (activeOrder) {
                    setTrackingOrder(activeOrder);
                    // Also switch tab to pending if not already
                    setActiveTab("pending");
                }
            }
        } catch (err) {
            console.error("Failed to fetch orders", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Listen for rider location updates
    useEffect(() => {
        if (!trackingOrder) return;

        // Join the order room
        socket.emit("join:order", trackingOrder._id);

        const handleLocationUpdate = (data) => {
            setRiderLocation({ lat: data.lat, lng: data.lng });
        };

        socket.on("rider:location:update", handleLocationUpdate);

        return () => {
            socket.off("rider:location:update", handleLocationUpdate);
        };
    }, [trackingOrder]);

    const startTracking = (order) => {
        setTrackingOrder(order);
        setRiderLocation(null); // Reset prev location
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePayOrder = async (orderId) => {
        try {
            // Simulate Payment Process
            const res = await fetch(`${API_URL}/api/orders/pay`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId }),
                credentials: "include"
            });
            const data = await res.json();
            if (data.success) {
                // Payment Success
                fetchOrders(); // Refresh
                alert("Payment Successful! Order Completed.");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const filteredOrders = orders.filter((order) => {
        if (activeTab === "pending") return ["pending", "assigned", "delivering"].includes(order.status);
        if (activeTab === "completed") return ["completed", "delivered"].includes(order.status);
        if (activeTab === "cancelled") return ["cancelled"].includes(order.status);
        return true;
    });

    return (
        <div className="min-h-screen flex flex-col bg-transparent text-riderLight font-sans">
            <Navbar />

            <main className="flex-grow pt-24 pb-16 px-6">
                <div className="max-w-4xl mx-auto">

                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-riderBlue/20 rounded-2xl flex items-center justify-center text-riderBlue text-2xl shadow-lg border border-riderBlue/30">
                            <FaBoxOpen />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-riderLight">My Orders</h1>
                            <p className="text-gray-600">Track and manage your deliveries</p>
                        </div>
                    </div>

                    {/* LIVE TRACKING SECTION (Uber-Style) */}
                    {trackingOrder && (
                        <div className="mb-8 w-full h-[500px] bg-riderBlack/90 rounded-3xl overflow-hidden shadow-2xl border border-riderBlue/20 relative animate-fade-in">
                            {/* Map Header Overlay */}
                            <div className="absolute top-0 left-0 right-0 z-[400] p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start pointer-events-none">
                                <div className="pointer-events-auto bg-riderBlack/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-riderBlue/20 shadow-lg">
                                    <h2 className="text-sm font-bold text-riderLight">Order #{trackingOrder._id.slice(-6).toUpperCase()}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <p className="text-xs text-green-400 font-bold uppercase tracking-wider">{trackingOrder.status}</p>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {riderLocation ? "Rider is sharing live location" : "Connecting to rider..."}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setTrackingOrder(null)}
                                    className="pointer-events-auto bg-riderBlack/80 backdrop-blur-md w-10 h-10 rounded-full flex items-center justify-center text-riderLight hover:bg-riderRed/20 hover:text-red-400 border border-riderBlue/20 transition-all shadow-lg"
                                    title="Minimize Map"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* The Map */}
                            <LiveMap
                                riderLocation={riderLocation}
                                deliveryLocation={trackingOrder.locationCoordinates || { lat: -1.2921, lng: 36.8219 }}
                            />

                            {/* Bottom Info Card (Floating) */}
                            <div className="absolute bottom-6 left-4 right-4 z-[400] pointer-events-none">
                                <div className="bg-riderBlack/90 backdrop-blur-xl border border-riderBlue/20 p-4 rounded-2xl shadow-xl flex items-center gap-4 max-w-md mx-auto pointer-events-auto">
                                    <div className="w-12 h-12 bg-riderBlue/20 rounded-full flex items-center justify-center text-riderBlue text-xl">
                                        🚍
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-riderLight">Delivery in Progress</h3>
                                        <p className="text-xs text-gray-400">Rider is on the way to the destination.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TABS */}
                    <div className="flex gap-2 mb-8 bg-riderBlack/90 backdrop-blur-md p-1 rounded-xl shadow-lg border border-riderBlue/10 w-fit">
                        <TabButton
                            active={activeTab === "pending"}
                            onClick={() => setActiveTab("pending")}
                            label="Pending"
                            icon={<FaClock />}
                            count={orders.filter(o => ["pending", "assigned", "delivering"].includes(o.status)).length}
                        />
                        <TabButton
                            active={activeTab === "completed"}
                            onClick={() => setActiveTab("completed")}
                            label="Completed"
                            icon={<FaCheckCircle />}
                            count={orders.filter(o => ["completed", "delivered"].includes(o.status)).length}
                        />
                        <TabButton
                            active={activeTab === "cancelled"}
                            onClick={() => setActiveTab("cancelled")}
                            label="Cancelled"
                            icon={<FaTimesCircle />}
                            count={orders.filter(o => ["cancelled"].includes(o.status)).length}
                        />
                    </div>

                    {/* ORDERS LIST */}
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-8 h-8 border-4 border-riderMaroon border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-20 bg-riderBlack/90 backdrop-blur-md rounded-2xl border border-dashed border-riderBlue/10">
                            <FaBoxOpen className="text-5xl mx-auto text-gray-600 mb-4" />
                            <h3 className="text-xl font-bold text-gray-600">No {activeTab} orders found</h3>
                            <Link to="/order" className="text-riderBlue hover:text-riderLight mt-2 inline-block transition-colors">Place new order</Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredOrders.map(order => (
                                <div key={order._id} className="bg-riderDark/90 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-riderBlue/10 flex flex-col md:flex-row justify-between gap-4 hover:bg-riderBlack transition-all">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${order.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                                                order.status === "completed" ? "bg-green-500/20 text-green-400" :
                                                    order.status === "cancelled" ? "bg-red-500/20 text-red-400" :
                                                        "bg-blue-500/20 text-blue-400"
                                                }`}>
                                                {order.status}
                                            </span>
                                            <span className="text-gray-600 text-xs">#{order._id.slice(-6).toUpperCase()}</span>
                                            <span className="text-gray-600 text-xs">• {new Date(order.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="font-bold text-lg mb-1 text-riderLight">{order.items?.length || 1} Items</h3>
                                        <p className="text-sm text-gray-600">{typeof order.location === 'string' ? order.location : (order.pickup?.address || "Location not specified")}</p>
                                    </div>

                                    <div className="text-right flex flex-col justify-center">
                                        <p className="text-xl font-bold text-riderMaroon">KES {order.amount}</p>

                                        {/* Actions based on Status */}
                                        {order.status === 'delivered' && !order.paid && (
                                            <div className="mt-2 flex flex-col gap-2">
                                                <span className="text-xs font-bold text-green-500 animate-pulse">Rider Arrived!</span>
                                                <button
                                                    onClick={() => {
                                                        const till = "123456"; // Mock Till
                                                        const confirm = window.confirm(`Pay KES ${order.amount} to Till ${till}?`);
                                                        if (confirm) handlePayOrder(order._id);
                                                    }}
                                                    className="bg-riderMaroon text-riderLight text-xs px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-rose-800 transition-all"
                                                >
                                                    Pay Now
                                                </button>
                                            </div>
                                        )}

                                        {/* Track Button */}
                                        {["assigned", "delivering"].includes(order.status) && (
                                            <button
                                                onClick={() => startTracking(order)}
                                                className="mt-2 text-xs bg-riderBlue text-riderLight px-3 py-1 rounded-full shadow hover:bg-blue-600 transition-colors flex items-center gap-1 justify-end ml-auto"
                                            >
                                                <span>🗺️</span> Track Rider
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </div>
            </main>
            <Footer />


        </div>
    );
}

function TabButton({ active, onClick, label, icon, count }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${active ? "bg-riderBlue text-riderLight shadow-md" : "text-gray-600 hover:bg-riderDark/50 hover:text-riderLight"
                }`}
        >
            {icon}
            {label}
            {count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-riderBlue/20 text-riderLight" : "bg-riderDark/20 text-gray-600"}`}>{count}</span>}
        </button>
    )
}
