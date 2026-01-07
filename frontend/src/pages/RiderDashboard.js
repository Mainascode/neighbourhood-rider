import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotify } from "../context/NotificationContext";
import { socket } from "../lib/socket.js";
import LiveMap from "../components/LiveMap";
import { API_URL } from "../lib/config";

export default function RiderDashboard({ tab = "orders" }) {
    const { user } = useAuth();
    const { notify } = useNotify();
    const [activeTab, setActiveTab] = useState(tab);
    const [assignments, setAssignments] = useState([]);
    const [riderProfile, setRiderProfile] = useState(null);
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setActiveTab(tab);
    }, [tab]);

    const activeOrder = assignments.find(a => a.status === 'delivering') || assignments[0];

    const fetchAssignments = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/orders/my`, {
                credentials: "include",
            });
            const data = await res.json();
            setAssignments(data);
        } catch (err) {
            console.error(err);
            notify("Failed to fetch assignments", "error");
        }
    }, [notify]);

    const fetchProfile = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/riders/me`, {
                credentials: "include",
            });
            const data = await res.json();
            setRiderProfile(data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchFaqs = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/faqs`);
            const data = await res.json();
            setFaqs(data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        if (activeTab === "orders") fetchAssignments();
        if (activeTab === "profile") fetchProfile();
        if (activeTab === "faqs") fetchFaqs();

        const handleNewAssignment = (order) => {
            notify("📦 New delivery assigned!", "success");
            if (activeTab === "orders") fetchAssignments();
        };

        socket.on(`rider:order:${user?.id}`, handleNewAssignment);

        return () => {
            socket.off(`rider:order:${user?.id}`, handleNewAssignment);
        };
    }, [activeTab, fetchAssignments, fetchProfile, fetchFaqs, notify, user]);

    const handleAcceptOrder = async (orderId) => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/orders/accept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId }),
                credentials: "include"
            });
            const data = await res.json();
            if (data.success) {
                notify("Order accepted! Start your engine 🏍️", "success");
                fetchAssignments();
            } else {
                notify(data.error || "Failed to accept order", "error");
            }
        } catch (e) {
            notify("Connection error", "error");
        } finally {
            setLoading(false);
        }
    };



    const handleCompleteOrder = async (orderId) => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/orders/pay`, { // Re-using Pay endpoint as it marks completed & paid
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId }),
                credentials: "include"
            });
            const data = await res.json();
            if (data.success) {
                notify("Payment Confirmed & Order Completed! 🎉", "success");
                fetchAssignments();
            } else {
                notify(data.error || "Failed to complete order", "error");
            }
        } catch (e) {
            notify("Connection error", "error");
        } finally {
            setLoading(false);
        }
    };


    const handleDeliverOrder = async (orderId) => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/orders/deliver`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId }),
                credentials: "include"
            });
            const data = await res.json();
            if (data.success) {
                notify("Order Delivered! Waiting for payment...", "success");
                fetchAssignments();
            } else {
                notify(data.error || "Failed to mark delivered", "error");
            }
        } catch (e) {
            notify("Connection error", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleOnline = async () => {
        try {
            const newStatus = !riderProfile.isAvailable;
            const res = await fetch(`${API_URL}/api/riders/me`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isAvailable: newStatus }),
                credentials: "include"
            });
            const data = await res.json();
            setRiderProfile(data);
            notify(newStatus ? "You are now ONLINE 🟢" : "You are now OFFLINE 🔴", "info");
        } catch (e) {
            notify("Failed to update status", "error");
        }
    };

    return (
        <div className="min-h-screen bg-transparent text-riderLight p-4 md:p-6 pb-20">
            {/* Header with Go Back */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-riderLight tracking-tight">Rider Dashboard</h1>
                <button
                    onClick={() => window.location.href = "/"}
                    className="flex items-center gap-2 bg-riderDark/50 hover:bg-riderBlue hover:text-white px-5 py-2.5 rounded-full border border-riderBlue/20 transition-all font-bold shadow-sm hover:shadow-lg"
                >
                    ← Go Back
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-riderBlue/10 pb-2 overflow-x-auto">
                {["orders", "map", "profile", "faqs"].map((t) => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={`capitalize pb-2 px-4 transition-all whitespace-nowrap ${activeTab === t
                            ? "text-riderMaroon border-b-2 border-riderMaroon font-bold"
                            : "text-gray-600 hover:text-riderLight"
                            }`}
                    >
                        {t === "orders" ? "Assigned Orders" : t === "map" ? "Live Map" : t === "profile" ? "My Profile" : "FAQs"}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === "orders" && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {assignments.length === 0 ? (
                        <div className="col-span-full bg-riderDark/50 backdrop-blur-md p-12 rounded-2xl shadow-lg border border-riderBlue/10 text-center text-gray-600">
                            <p className="text-xl">No active deliveries.</p>
                            <p className="text-sm mt-2 opacity-50">Wait for the admin to assign you some work!</p>
                        </div>
                    ) : (
                        assignments.map((order) => (
                            <div key={order._id} className="relative group bg-riderDark/50 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-riderBlue/10 hover:bg-riderDark/70 transition-all duration-300 hover:-translate-y-1">
                                {order.status === 'assigned' && <div className="absolute top-0 right-0 p-2"><span className="animate-pulse w-3 h-3 bg-blue-500 rounded-full inline-block"></span></div>}

                                <div className="mb-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-xs text-riderMaroon font-extrabold uppercase tracking-widest">Order #{order._id.slice(-6)}</p>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${order.status === "delivered" || order.status === "completed" ? "bg-green-500/20 text-green-400" :
                                            order.status === "delivering" ? "bg-orange-500/20 text-orange-400" :
                                                "bg-blue-500/20 text-blue-400"
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-xl text-riderLight mb-1">{order.customer?.name || "Customer"}</h3>
                                    <a href={`tel:${order.customer?.phone}`} className="text-sm text-riderLight/80 hover:text-riderMaroon flex items-center gap-2">
                                        📞 {order.customer?.phone}
                                    </a>
                                </div>

                                <div className="space-y-2 mb-6 text-sm text-gray-600 bg-riderDark/30 p-3 rounded-lg">
                                    <div className="flex justify-between">
                                        <span>Pick Up:</span>
                                        <span className="text-riderLight text-right truncate max-w-[150px]">{order.pickup?.address || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Drop Off:</span>
                                        <span className="text-riderLight text-right truncate max-w-[150px]">{order.dropoff || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-riderBlue/10 pt-2 mt-2">
                                        <span>Total:</span>
                                        <span className="text-riderMaroon font-bold">KES {order.amount || "0"}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-3">
                                    {order.status === 'assigned' && (
                                        <button
                                            onClick={() => handleAcceptOrder(order._id)}
                                            disabled={loading}
                                            className="col-span-2 bg-gradient-to-r from-blue-600 to-blue-500 text-riderLight font-bold py-3 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {loading ? "Processing..." : "Accept Order 🚀"}
                                        </button>
                                    )}

                                    {order.status === 'delivering' && (
                                        <>
                                            <a
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${order.dropoff}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="bg-riderBlue/10 text-center py-3 rounded-xl text-riderLight font-bold hover:bg-riderBlue/20 transition-all"
                                            >
                                                Navigate 🗺️
                                            </a>
                                            <button
                                                onClick={() => handleDeliverOrder(order._id)}
                                                disabled={loading}
                                                className="bg-riderMaroon text-riderLight font-bold py-3 rounded-xl shadow-lg hover:shadow-pink-500/30 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                Arrived / Delivered 📍
                                            </button>
                                        </>
                                    )}

                                    {order.status === 'delivered' && (
                                        <div className="col-span-full">
                                            <div className="text-center bg-green-500/10 p-3 rounded-xl border border-green-500/20 mb-3">
                                                <p className="font-bold text-green-600">Waiting for Payment...</p>
                                                <p className="text-xs text-gray-600">Once you receive cash/M-Pesa, press complete.</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm("Have you received payment?")) handleCompleteOrder(order._id);
                                                }}
                                                disabled={loading}
                                                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                Payment Received & Complete ✅
                                            </button>
                                        </div>
                                    )}

                                    {order.status === 'completed' && (
                                        <div className="col-span-full text-center bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                                            <p className="font-bold text-blue-500">Order Completed ✅</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === "map" && (
                <div className="bg-riderDark/50 backdrop-blur-md rounded-3xl p-6 border border-riderBlue/10 shadow-xl min-h-[500px] flex flex-col">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <span className="text-3xl">🗺️</span> Live Map
                    </h2>
                    <p className="text-gray-600 mb-6 font-medium">
                        Your real-time location is being shared with the client when you are online.
                    </p>
                    <div className="flex-1 rounded-2xl overflow-hidden border border-riderBlue/10">
                        <LiveMap role="rider" socket={socket} order={activeOrder} />
                    </div>
                </div>
            )}

            {activeTab === "profile" && riderProfile && (
                <div className="bg-riderDark/50 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-riderBlue/10 max-w-2xl mx-auto">
                    <div className="md:flex gap-8 items-start">
                        <div className="mb-6 md:mb-0 shrink-0">
                            <img src={riderProfile.riderPicture || "https://placehold.co/400"} alt="Profile" className="w-40 h-40 rounded-full object-cover bg-riderDark/30 border-4 border-riderMaroon shadow-2xl" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-3xl font-bold mb-1 text-riderLight">{riderProfile.name}</h3>
                            <p className="text-riderMaroon font-mono mb-6">{riderProfile.phone}</p>

                            <div className="space-y-4 text-sm bg-riderDark/30 p-6 rounded-xl">
                                <div className="flex justify-between border-b border-riderBlue/10 pb-2">
                                    <span className="text-gray-600">Status</span>
                                    <span className="font-bold capitalize text-green-400 bg-green-500/10 px-2 py-1 rounded">{riderProfile.status}</span>
                                </div>
                                <div className="flex justify-between border-b border-riderBlue/10 pb-2">
                                    <span className="text-gray-600">Online Status</span>
                                    <button
                                        onClick={handleToggleOnline}
                                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold shadow-sm transition-all active:scale-95 ${riderProfile.isAvailable ? "bg-green-500/20 text-green-600 border border-green-500/30 hover:bg-green-500/30" : "bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30"}`}
                                    >
                                        {riderProfile.isAvailable ? "🟢 Online" : "🔴 Offline"}
                                        <span className="text-xs opacity-70">(Tap to change)</span>
                                    </button>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">National ID</span>
                                    <span className="font-bold text-riderLight font-mono">{riderProfile.idNumber}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "faqs" && (
                <div className="max-w-3xl mx-auto space-y-4">
                    {faqs.map(faq => (
                        <div key={faq._id} className="bg-riderDark/50 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-riderBlue/10 hover:bg-riderDark/70 transition">
                            <h4 className="font-bold text-lg mb-2 text-riderMaroon">{faq.question}</h4>
                            <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                        </div>
                    ))}
                    {faqs.length === 0 && <p className="text-gray-600 text-center">No FAQs available yet.</p>}
                </div>
            )}
        </div>
    );
}
