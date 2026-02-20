import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotify } from "../context/NotificationContext";
import { socket } from "../lib/socket.js";
import LiveMap from "../components/LiveMap";
import { apiGetCached, invalidateCache } from "../lib/api";

import { API_URL } from "../lib/config";
import ReviewList from "../components/ReviewList";

export default function RiderDashboard({ tab = "orders" }) {
    const { user } = useAuth();
    const { notify } = useNotify();
    const [activeTab, setActiveTab] = useState(tab);
    const [assignments, setAssignments] = useState([]);
    const [riderProfile, setRiderProfile] = useState(null);
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [acceptTimers, setAcceptTimers] = useState({});

    useEffect(() => {
        setActiveTab(tab);
    }, [tab]);

    const activeOrder = Array.isArray(assignments) ? assignments.find(a => ['ON_THE_WAY'].includes(a.status)) : null;

    useEffect(() => {
        if (!activeOrder?._id) return;
        socket.emit("join:order", activeOrder._id);

        const handleUserLocation = (data) => {
            setUserLocation({ lat: data.lat, lng: data.lng });
        };

        socket.on("user:location:update", handleUserLocation);

        return () => {
            socket.off("user:location:update", handleUserLocation);
        };
    }, [activeOrder?._id]);

    const fetchAssignments = useCallback(async () => {
        try {
            const data = await apiGetCached("/api/orders/my", { ttlMs: 5000 });
            setAssignments(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            notify("Failed to fetch assignments", "error");
            setAssignments([]);
        }
    }, [notify]);

    const fetchProfile = useCallback(async () => {
        try {
            const data = await apiGetCached("/api/riders/me", { ttlMs: 10000 });
            setRiderProfile(data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchFaqs = useCallback(async () => {
        try {
            const data = await apiGetCached("/api/faqs", { ttlMs: 30000 });
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
            if (order?.acceptBy) {
                setAcceptTimers(prev => ({ ...prev, [order._id]: order.acceptBy }));
            }
        };

        socket.on(`rider:order:${user?.id}`, handleNewAssignment);

        return () => {
            socket.off(`rider:order:${user?.id}`, handleNewAssignment);
        };
    }, [activeTab, fetchAssignments, fetchProfile, fetchFaqs, notify, user]);

    useEffect(() => {
        const interval = setInterval(() => {
            setAcceptTimers(prev => ({ ...prev }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const getTimeLeft = (orderId) => {
        const acceptBy = acceptTimers[orderId];
        if (!acceptBy) return null;
        const msLeft = acceptBy - Date.now();
        return Math.max(0, Math.ceil(msLeft / 1000));
    };

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
                invalidateCache("/api/orders/my");
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



    const handleCompleteOrder = async (order, amount) => {
        const orderId = order._id;
        // Strict Confirmation
        /* const confirmPayment = window.confirm(`💰 HANDLE CASH: Have you received KES ${amount} from the client?\n\nClick OK only if you have the money in hand.`);
        if (!confirmPayment) return; */

        // Check if user confirmed receipt
        if (!order.isReceived) {
            alert("⚠️ The client has NOT confirmed receipt yet.\n\nPlease ask them to open their app and click 'I Have Received My Order'.");
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/orders/pay`, { // Re-using Pay endpoint as it marks paid
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId }),
                credentials: "include"
            });
            const data = await res.json();
            if (data.success || !data.error) { // Handling potential inconsistent response keys
                invalidateCache("/api/orders/my");
                notify("Payment Confirmed & Order Completed! 🎉", "success");
                fetchAssignments();
            } else {
                notify(data.error || "Failed to complete order: Invalid Code", "error");
            }
        } catch (e) {
            notify("Connection error", "error");
        } finally {
            setLoading(false);
        }
    };


    const handleDeliverOrder = async (order) => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/orders/deliver`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: order._id }),
                credentials: "include"
            });
            const data = await res.json();
            if (data.success) {
                invalidateCache("/api/orders/my");
                if (order.paid || order.goodsPaid) {
                    notify(`Order Delivered! KES ${order.deliveryFee} earned ✅`, "success");
                } else {
                    notify("Order Delivered! Waiting for payment...", "success");
                }
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
            const goingOnline = !riderProfile.isAvailable;
            if (goingOnline) {
                if (!navigator.geolocation) {
                    notify("Location permission is required to go online", "error");
                    return;
                }
                const position = await new Promise((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject)
                );
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                const res = await fetch(`${API_URL}/api/riders/go-online`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ location }),
                    credentials: "include"
                });
                const data = await res.json();
                if (!res.ok) {
                    notify(data.error || "Failed to go online", "error");
                    return;
                }
                setRiderProfile(data.rider || data);
                notify("You are now ONLINE 🟢", "info");
            } else {
                const reason = window.prompt("Why are you going offline? (e.g., Break, Off shift, Vehicle issue)") || "OTHER";
                const res = await fetch(`${API_URL}/api/riders/go-offline`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reason }),
                    credentials: "include"
                });
                const data = await res.json();
                if (!res.ok) {
                    notify(data.error || "Failed to go offline", "error");
                    return;
                }
                setRiderProfile(data.rider || data);
                notify("You are now OFFLINE 🔴", "info");
            }
        } catch (e) {
            notify("Failed to update status", "error");
        }
    };

    const riderStatus = riderProfile?.status;

    useEffect(() => {
        if (!riderStatus || riderStatus === "OFFLINE") return;
        if (!navigator.geolocation) return;

        const interval = setInterval(async () => {
            try {
                const position = await new Promise((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject)
                );
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                await fetch(`${API_URL}/api/riders/heartbeat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ location }),
                    credentials: "include"
                });
            } catch (e) {
                // silently ignore heartbeat failures
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [riderStatus]);

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

            <div className="flex gap-4 mb-8 border-b border-riderBlue/10 pb-2 overflow-x-auto">
                {["orders", activeOrder ? "map" : null, "reviews", "profile", "faqs"].filter(Boolean).map((t) => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={`capitalize pb-2 px-4 transition-all whitespace-nowrap ${activeTab === t
                            ? "text-riderMaroon border-b-2 border-riderMaroon font-bold"
                            : "text-gray-600 hover:text-riderLight"
                            }`}
                    >
                        {t === "orders" ? "Assigned Orders" : t === "map" ? "Live Map" : t === "reviews" ? "My Reviews" : t === "profile" ? "My Profile" : "FAQs"}
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
                                {order.status === 'RIDER_ASSIGNED' && <div className="absolute top-0 right-0 p-2"><span className="animate-pulse w-3 h-3 bg-blue-500 rounded-full inline-block"></span></div>}

                                <div className="mb-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-xs text-riderMaroon font-extrabold uppercase tracking-widest">Order #{order._id.slice(-6)}</p>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${order.status === "DELIVERED" ? "bg-green-500/20 text-green-400" :
                                            order.status === "ON_THE_WAY" ? "bg-orange-500/20 text-orange-400" :
                                                "bg-blue-500/20 text-blue-400"
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-xl text-riderLight mb-1">{order.customer?.name || "Customer"}</h3>
                                    <div className="flex gap-2 mt-2">
                                        <a href={`tel:${order.customer?.phone}`} className="flex-1 bg-green-600/20 text-green-400 text-sm font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 hover:bg-green-600/40 transition-all">
                                            📞 Call
                                        </a>
                                        <a href={`https://wa.me/${order.customer?.phone?.replace('+', '')}`} target="_blank" rel="noreferrer" className="flex-1 bg-green-500 text-white text-sm font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 hover:bg-green-600 transition-all shadow-md">
                                            💬 WhatsApp
                                        </a>
                                    </div>
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
                                    {order.status === 'RIDER_ASSIGNED' && (
                                        <button
                                            onClick={() => handleAcceptOrder(order._id)}
                                            disabled={loading}
                                            className="col-span-2 bg-gradient-to-r from-blue-600 to-blue-500 text-riderLight font-bold py-3 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {loading ? "Processing..." : "Accept Order 🚀"}
                                        </button>
                                    )}
                                    {order.status === 'RIDER_ASSIGNED' && getTimeLeft(order._id) !== null && (
                                        <div className="col-span-2 text-center text-xs text-gray-500">
                                            Accept within <span className="font-bold text-riderMaroon">{getTimeLeft(order._id)}s</span> or it will be reassigned.
                                        </div>
                                    )}

                                    {order.status === 'ON_THE_WAY' && !order.pickedUpAt && (
                                        <div className="col-span-full bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 text-center">
                                            <p className="font-bold text-yellow-500 mb-2">At the Shop</p>
                                            <p className="text-sm text-gray-400 mb-4">Ensure client pays <strong>KES {order.goodsTotal}</strong> to Vendor.</p>
                                            <button
                                                onClick={async () => {
                                                    const confirm = window.confirm("Has the Vendor confirmed receipt of payment?");
                                                    if (!confirm) return;
                                                    try {
                                                        setLoading(true);
                                                        const res = await fetch(`${API_URL}/api/orders/pickup`, {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({ orderId: order._id }),
                                                            credentials: "include"
                                                        });
                                                        const data = await res.json();
                                                        if (data.success) {
                                                            notify("Pickup Confirmed! Start Delivery 🏍️", "success");
                                                            fetchAssignments();
                                                        } else notify(data.error, "error");
                                                    } catch (e) { notify("Error", "error"); }
                                                    finally { setLoading(false); }
                                                }}
                                                disabled={loading}
                                                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
                                            >
                                                Vendor Paid & Items Picked ✅
                                            </button>
                                        </div>
                                    )}

                                    {order.status === 'ON_THE_WAY' && order.pickedUpAt && (
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
                                                onClick={() => handleDeliverOrder(order)}
                                                disabled={loading}
                                                className="bg-riderMaroon text-riderLight font-bold py-3 rounded-xl shadow-lg hover:shadow-pink-500/30 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                Arrived / Delivered 📍
                                            </button>
                                        </>
                                    )}

                                    {order.status === 'DELIVERED' && (
                                        <div className="col-span-full">
                                            <div className="text-center bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 mb-3">
                                                <p className="font-bold text-yellow-600 text-lg mb-2">Wait for Payment 💰</p>
                                                {order.goodsPaid ? (
                                                    // New Flow: Collect Delivery Fee Only
                                                    <>
                                                        <p className="text-sm text-gray-600 mb-2">Collect <strong>Delivery Fee</strong> Only.</p>
                                                        <p className="text-2xl font-black text-riderMaroon mb-4">KES {order.deliveryFee || 200}</p>
                                                        <button
                                                            onClick={() => handleCompleteOrder(order, order.deliveryFee || 200)}
                                                            className="bg-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-green-700 transition-all w-full animate-pulse"
                                                        >
                                                            I Have Received KES {order.deliveryFee || 200}
                                                        </button>
                                                    </>
                                                ) : (
                                                    // Legacy / Fallback
                                                    <>
                                                        <p className="text-sm text-gray-600 mb-4">Client should pay you <strong>KES {order.amount}</strong> now.</p>
                                                        <button
                                                            onClick={() => handleCompleteOrder(order, order.amount)}
                                                            className="bg-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-green-700 transition-all w-full animate-pulse"
                                                        >
                                                            I Have Received KES {order.amount}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
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
                        <LiveMap
                            role="rider"
                            socket={socket}
                            order={activeOrder}
                            userLocation={userLocation}
                            deliveryLocation={activeOrder?.dropoff?.location?.coordinates ? {
                                lat: activeOrder.dropoff.location.coordinates[1],
                                lng: activeOrder.dropoff.location.coordinates[0]
                            } : activeOrder?.location?.coordinates ? { // Fallback for direct location objects
                                lat: activeOrder.location.coordinates[1],
                                lng: activeOrder.location.coordinates[0]
                            } : null}
                        />
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
                            <div className="mb-6 bg-riderDark/30 p-4 rounded-xl text-sm">
                                <p className="text-gray-500 uppercase tracking-wider text-xs mb-1">Logged In As</p>
                                <p className="font-bold text-riderLight">{user?.name || riderProfile.name}</p>
                                <p className="text-gray-600 font-mono">{user?.email || "email-not-available"}</p>
                            </div>

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

            {/* REVIEWS TAB */}
            {activeTab === "reviews" && riderProfile && (
                <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-riderDark/50 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-riderBlue/10">
                        <ReviewList targetId={riderProfile._id} type="rider" />
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
