import { useState, useEffect } from "react";
import OperatingHoursBanner from "../components/OperatingHoursBanner";
import Navbar from "../components/Navbar";
import GooglePayButton from "@google-pay/button-react";
import ReviewForm from "../components/ReviewForm";

import Footer from "../components/Footer";


import { useAuth } from "../context/AuthContext";
import { socket } from "../lib/socket";
import LiveMap from "../components/LiveMap";
import { apiFetch, apiGetCached, invalidateCache } from "../lib/api";
/* useNotify removed */

export default function Order() {
    const { user } = useAuth();
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewTarget, setReviewTarget] = useState(null); // { id, role, orderId }

    const [showFaq, setShowFaq] = useState(false);
    const [faqs] = useState([]);
    const [activeOrder, setActiveOrder] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [cart, setCart] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [paymentMethod, setPaymentMethod] = useState('mpesa');
    const [mpesaPhone, setMpesaPhone] = useState('');
    const [serverHour, setServerHour] = useState(null);
    const [serverMinute, setServerMinute] = useState(0);
    const [wishlistItems, setWishlistItems] = useState([]);
    const [wishlistLoading, setWishlistLoading] = useState(false);
    const [recommendations, setRecommendations] = useState([]);

    useEffect(() => {
        if (user?.phone) setMpesaPhone(user.phone);
    }, [user]);

    useEffect(() => {
        const fetchWishlist = async () => {
            if (!user) return;
            setWishlistLoading(true);
            try {
                const data = await apiGetCached("/api/wishlist", { ttlMs: 15000 });
                setWishlistItems(Array.isArray(data) ? data : []);
            } catch (e) { }
            finally { setWishlistLoading(false); }
        };

        const fetchRecommendations = async () => {
            if (!user) return;
            try {
                const data = await apiGetCached("/api/orders/recommendations", { ttlMs: 30000 });
                setRecommendations(Array.isArray(data?.items) ? data.items : []);
            } catch (e) { }
        };

        fetchWishlist();
        fetchRecommendations();
    }, [user]);

    useEffect(() => {
        if (!activeOrder?._id) return;
        socket.emit("join:order", activeOrder._id);
        const handleOrderUpdate = (order) => {
            if (order?._id === activeOrder._id) {
                setActiveOrder(order);
            }
        };
        socket.on("order:update", handleOrderUpdate);
        return () => {
            socket.off("order:update", handleOrderUpdate);
        };
    }, [activeOrder?._id]);

    useEffect(() => {
        if (!activeOrder?._id) return;
        const shareStatuses = ["RIDER_ASSIGNED", "ON_THE_WAY"];
        if (!shareStatuses.includes(activeOrder.status)) return;
        if (!navigator.geolocation) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                socket.emit("user:location", {
                    orderId: activeOrder._id,
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                });
            },
            () => { },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [activeOrder?._id, activeOrder?.status]);

    useEffect(() => {
        setPaymentConfirmed(activeOrder?.status === "PAYMENT_CONFIRMED");
    }, [activeOrder?.status]);

    useEffect(() => {
        const fetchTimeline = async () => {
            if (!activeOrder?._id) return;
            try {
                const data = await apiFetch(`/api/orders/${activeOrder._id}/timeline`, {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
                });
                setTimeline(Array.isArray(data?.timeline) ? data.timeline : []);
            } catch (e) { }
        };
        fetchTimeline();
    }, [activeOrder?._id]);

    useEffect(() => {
        const fetchServerTime = async () => {
            try {
                const data = await apiGetCached("/api/system/time", { ttlMs: 30000 });
                if (typeof data.hour === "number") setServerHour(data.hour);
                if (typeof data.minute === "number") setServerMinute(data.minute);
            } catch (e) { }
        };
        fetchServerTime();
    }, []);

    // Wait, Order.js doesn't import useNotify. Let me fix imports first in next call. 
    // For now I'll use simple alert or console if notify missing, but better to add it.

    // Check for active order on mount
    useEffect(() => {
        fetchVendors();
        const checkOrder = async () => {
            try {
                const data = await apiFetch("/api/orders/my", {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
                });
                if (data && data.length > 0) {
                    // Find active order
                    const active = data.find(o => [
                        'CREATED',
                        'PAYMENT_PENDING',
                        'PAYMENT_CONFIRMED',
                        'VENDOR_ACCEPTED',
                        'PREPARING',
                        'READY_FOR_PICKUP',
                        'RIDER_ASSIGNED',
                        'ON_THE_WAY',
                        'DELIVERED'
                    ].includes(o.status));
                    if (active) setActiveOrder(active);
                }
            } catch (e) { }
        };
        checkOrder();
    }, []);

    const fetchVendors = async () => {
        try {
            const data = await apiGetCached("/api/vendors/nearby", { ttlMs: 20000 });
            setVendors(Array.isArray(data) ? data : (data.vendors || []));
        } catch (err) { console.error(err); }
    };

    const handleSelectVendor = (vendor) => {
        setSelectedVendor(vendor);
        setCart([]); // Clear cart when switching vendors
    };

    const addItemToCart = (item) => {
        setCart(prev => [...prev, item]);
    };

    const isWishlisted = (vendorId, item) => {
        const itemId = item?._id;
        return wishlistItems.some(w =>
            w.vendorId === vendorId &&
            (itemId ? w.itemId === itemId : w.name === item?.name)
        );
    };

    const saveToWishlist = async (vendor, item) => {
        if (!user) return alert("Please login first!");
        try {
            const data = await apiFetch("/api/wishlist", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    vendorId: vendor._id,
                    vendorName: vendor.storeName,
                    itemId: item._id,
                    name: item.name,
                    price: item.price,
                    image: item.image
                })
            });
            invalidateCache("/api/wishlist");
            setWishlistItems(prev => {
                if (prev.some(w => w._id === data._id)) return prev;
                return [data, ...prev];
            });
        } catch (e) { }
    };

    const removeWishlistItem = async (id) => {
        try {
            await apiFetch(`/api/wishlist/${id}`, {
                method: "DELETE",
            });
            invalidateCache("/api/wishlist");
            setWishlistItems(prev => prev.filter(w => w._id !== id));
        } catch (e) { }
    };

    const addWishlistItemToCart = async (wish) => {
        let vendor = vendors.find(v => v._id === wish.vendorId);
        if (!vendor && wish.vendorId) {
            try {
                vendor = await apiGetCached(`/api/vendors/${wish.vendorId}/public`, { ttlMs: 60000 });
                setVendors(prev => prev.some(v => v._id === vendor._id) ? prev : [...prev, vendor]);
            } catch (e) { }
        }

        if (!vendor) return alert("Vendor is not available.");

        const differentVendor = selectedVendor && selectedVendor._id !== vendor._id;
        if (differentVendor) setCart([]);
        setSelectedVendor(vendor);
        setCart(prev => (differentVendor ? [] : prev).concat({
            _id: wish.itemId,
            name: wish.name,
            price: wish.price,
            image: wish.image
        }));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const placeOrder = async () => {
        if (!user) return alert("Please login first!"); // Replace with notify later
        if (cart.length === 0) return;


        const vendorIsOpen = (selectedVendor?.isOpen !== false) && !selectedVendor?.isManuallyClosed;
        if (!vendorIsOpen) {
            return alert("Vendor is currently closed. Please try again later.");
        }

        const closingTime = selectedVendor?.closingTime || "21:00";
        const [closeH, closeM] = closingTime.split(":").map(Number);
        const closingMinutes = (Number.isFinite(closeH) ? closeH : 21) * 60 + (Number.isFinite(closeM) ? closeM : 0);
        const prepMinutes = selectedVendor?.prepTimeMinutes || 20;
        const deliveryMinutes = selectedVendor?.etaMinutes || 30;
        const totalMinutes = prepMinutes + deliveryMinutes;
        if (typeof serverHour === "number") {
            const currentMinutes = serverHour * 60 + (serverMinute || 0);
            const minutesUntilClose = Math.max(0, closingMinutes - currentMinutes);
            if (minutesUntilClose > 0 && totalMinutes > minutesUntilClose) {
                const proceed = window.confirm("Vendor may close before delivery completes. Do you want to proceed?");
                if (!proceed) return;
            }
        }

        // Get location
        const locationConfirmed = window.confirm("Use your current profile location for delivery?");
        if (!locationConfirmed) return;

        try {
            // Get Geolocation
            const getPosition = () => {
                return new Promise((resolve, reject) => {
                    if (!navigator.geolocation) {
                        reject(new Error("Geolocation is not supported by your browser"));
                    } else {
                        navigator.geolocation.getCurrentPosition(resolve, reject);
                    }
                });
            };

            let coords = { lat: -1.2921, lng: 36.8219 }; // Default Nairobi
            try {
                const position = await getPosition();
                coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
            } catch (geoError) {
                console.warn("Geolocation failed: ", geoError);
                alert("Could not access location. Using default/profile address.");
            }

            const data = await apiFetch("/api/orders/create", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify({
                    vendorId: selectedVendor._id,
                    items: cart,
                    address: "My Profile Address", // Backend should handle or fetch from user
                    pickupLng: selectedVendor.location.coordinates[0],
                    pickupLat: selectedVendor.location.coordinates[1],
                    dropoff: { address: "User Device Location" },
                    dropoffLat: coords.lat,
                    dropoffLng: coords.lng,
                    isScheduled: (() => {
                        const now = new Date();
                        const h = now.getHours();
                        return h < 6 || h >= 21;
                    })(),
                    scheduledFor: (() => {
                        const now = new Date();
                        const h = now.getHours();
                        if (h < 6 || h >= 21) {
                            // Next 6 AM
                            const target = new Date(now);
                            target.setHours(6, 0, 0, 0);
                            if (h >= 21) target.setDate(target.getDate() + 1);
                            return target;
                        }
                        return null;
                    })()
                })
            });

            setActiveOrder(data.order);
            setSelectedVendor(null);
            setCart([]);
            invalidateCache("/api/orders/my");
            if (data.order.status === 'PAYMENT_PENDING') {
                alert("Order Created! Please complete payment to proceed.");
            } else {
                alert("Order Placed! Waiting for Vendor/Rider.");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to place order.");
        }
    };

    /* handleOpenFaq removed as unused */

    const payDeliveryFee = async (method, paymentData = null) => {
        if (!activeOrder) return;
        try {
            const body = {
                orderId: activeOrder._id,
                paymentMethod: method,
                phoneNumber: mpesaPhone
            };

            if (method === 'google_pay') {
                body.token = paymentData; // Send token to backend
            }

            const data = await apiFetch("/api/orders/pay-delivery", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify(body)
            });

            if (method === 'mpesa') {
                alert("STK Push Sent! Check your phone.");
            } else {
                setActiveOrder(data.order);
                setPaymentConfirmed(true);
            }
        } catch (err) {
            console.error(err);
            alert("Payment error.");
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-transparent text-riderLight relative">
            <OperatingHoursBanner />
            <Navbar />

            <main className="flex-grow flex flex-col items-center justify-start pt-24 pb-12 px-4 md:px-6 z-10 w-full max-w-7xl mx-auto">

                {/* Header Section */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-5xl font-extrabold mb-4 text-riderLight tracking-tight">
                        What do you need today?
                    </h1>
                    <p className="text-base md:text-lg text-gray-500 max-w-lg mx-auto">
                        Select a shop below to browse their inventory.
                    </p>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 w-full">
                    {/* VENDOR GRID */}
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                        <h2 className="text-xl font-bold text-riderLight">Nearby Shops</h2>
                        <span className="text-riderBlue text-sm font-bold bg-riderBlue/10 px-3 py-1 rounded-full cursor-pointer hover:bg-riderBlue/20">View All</span>
                    </div>

                    {/* Category Filter Bar */}
                    <div className="flex gap-3 overflow-x-auto pb-4 mb-4 scrollbar-hide">
                        {['all', 'shop', 'pharmacy', 'gas', 'water', 'market', 'butchery', 'liquor', 'food'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${selectedCategory === cat
                                    ? 'bg-riderMaroon text-white border-riderMaroon'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-riderMaroon/50'
                                    }`}
                            >
                                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </button>
                        ))}
                    </div>

                    {typeof serverHour === "number" && serverHour >= 21 && (
                        <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 rounded-xl px-4 py-3 text-sm font-semibold">
                            Late order in progress
                            <div className="text-xs mt-1">Delivery continues as normal</div>
                        </div>
                    )}

                    {user && (
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-bold text-riderLight">Recommended for you</h2>
                            </div>
                            {recommendations.length === 0 ? (
                                <div className="bg-riderDark/30 border border-white/10 rounded-xl p-4 text-sm text-gray-500">
                                    No recommendations yet. Order a few items to personalize this section.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {recommendations.map((item, idx) => (
                                        <div key={`${item.vendorId}-${item.name}-${idx}`} className="bg-riderDark/30 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                                            <div className="aspect-square bg-black/20 rounded-lg overflow-hidden">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-3xl">⭐</div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm truncate">{item.name}</h4>
                                                <p className="text-[11px] text-gray-400 truncate">{item.vendorName || "Vendor"}</p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-riderBlue font-bold text-sm">{typeof item.price === "number" ? `KES ${item.price}` : " "}</span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => addWishlistItemToCart(item)}
                                                            className="bg-riderBlue hover:bg-blue-600 text-white text-[11px] px-2 py-1 rounded"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {user && (
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-bold text-riderLight">Wishlist</h2>
                            </div>
                            {wishlistLoading ? (
                                <div className="bg-riderDark/30 border border-white/10 rounded-xl p-4 text-sm text-gray-500">
                                    Loading wishlist...
                                </div>
                            ) : wishlistItems.length === 0 ? (
                                <div className="bg-riderDark/30 border border-white/10 rounded-xl p-4 text-sm text-gray-500">
                                    Save items to come back to later.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {wishlistItems.map(item => (
                                        <div key={item._id} className="bg-riderDark/30 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                                            <div className="aspect-square bg-black/20 rounded-lg overflow-hidden">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-3xl">📌</div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm truncate">{item.name}</h4>
                                                <p className="text-[11px] text-gray-400 truncate">{item.vendorName || "Vendor"}</p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-riderBlue font-bold text-sm">{typeof item.price === "number" ? `KES ${item.price}` : " "}</span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => addWishlistItemToCart(item)}
                                                            className="bg-riderBlue hover:bg-blue-600 text-white text-[11px] px-2 py-1 rounded"
                                                        >
                                                            Add
                                                        </button>
                                                        <button
                                                            onClick={() => removeWishlistItem(item._id)}
                                                            className="bg-white/10 hover:bg-white/20 text-gray-200 text-[11px] px-2 py-1 rounded"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                        {vendors.filter(v => selectedCategory === 'all' || v.category === selectedCategory).length === 0 ? (
                            <p className="col-span-full text-gray-400 py-10 text-center italic">No shops found in this category.</p>
                        ) : (
                            vendors.filter(v => selectedCategory === 'all' || v.category === selectedCategory).map((vendor) => (
                                <div
                                    key={vendor._id}
                                    onClick={() => handleSelectVendor(vendor)}
                                    className="bg-gray-50 p-0 rounded-2xl border border-gray-200 hover:border-riderBlue/50 transition-all group cursor-pointer hover:-translate-y-1 hover:shadow-md flex flex-col overflow-hidden"
                                >
                                    <div className="w-full h-40 bg-gray-200 relative">
                                        <img
                                            src={vendor.logo || `https://ui-avatars.com/api/?name=${vendor.storeName}&background=random`}
                                            alt={vendor.storeName}
                                            className="w-full h-full object-cover"
                                        />

                                        {/* Status Badge based on time */}
                                        {(() => {
                                            const now = new Date();
                                            const currentMinutes = typeof serverHour === "number"
                                                ? serverHour * 60 + (serverMinute || 0)
                                                : now.getHours() * 60 + now.getMinutes();
                                            const [openH, openM] = (vendor.openingTime || "08:00").split(':').map(Number);
                                            const [closeH, closeM] = (vendor.closingTime || "20:00").split(':').map(Number);
                                            const openMinutes = openH * 60 + openM;
                                            const closeMinutes = closeH * 60 + closeM;
                                            const isTimeOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

                                            const isLate = typeof serverHour === "number" && serverHour >= 21;
                                            const manualClosed = vendor.isManuallyClosed;
                                            if (manualClosed || (!isLate && (!isTimeOpen || !vendor.isOpen))) {
                                                return (
                                                    <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center backdrop-blur-sm p-4 text-center z-10">
                                                        <span className="text-red-500 font-bold uppercase text-xs border border-red-500 px-3 py-1 rounded-full bg-white mb-2">
                                                            Currently Closed
                                                        </span>
                                                        <p className="text-xs font-bold text-gray-600">
                                                            Hours: {vendor.openingTime} - {vendor.closingTime}
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-riderLight text-lg truncate">{vendor.storeName}</h3>
                                            <div className="flex items-center gap-2">
                                                {typeof serverHour === "number" && serverHour >= 21 && (vendor.status === "approved") && (
                                                    <span title="Delivery continues as normal." className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded">
                                                        Late Order
                                                    </span>
                                                )}
                                                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded">
                                                    {(vendor.metrics?.vendorScore ?? vendor.metrics?.rating ?? 0).toFixed(1)} ★
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 truncate mb-1">{vendor.address || "Nearby"}</p>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                                                🕒 {vendor.openingTime || "08:00"} - {vendor.closingTime || "20:00"}
                                            </span>
                                            {/* Logic to show Open/Closed text if needed, but the overlay covers it if closed */}
                                        </div>
                                        <button className="w-full bg-white border border-gray-200 text-riderLight font-bold py-2 rounded-xl text-sm group-hover:bg-riderBlue group-hover:text-white group-hover:border-riderBlue transition-colors">
                                            Visit Shop
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* VENDOR MODAL */}
            {selectedVendor && (
                <div className="fixed inset-0 bg-riderBlack/90 z-50 flex items-center justify-center p-4">
                    <div className="bg-riderBlack border border-riderBlue/10 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col text-riderLight">
                        {/* Header */}
                        <div className="p-6 border-b border-riderBlue/10 flex justify-between items-center bg-riderDark/50 shrink-0">
                            <div>
                                {typeof serverHour === "number" && serverHour >= 21 && (
                                    <div className="mb-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 rounded-lg px-3 py-2 text-xs font-semibold">
                                        Late order in progress
                                        <div className="text-[11px] mt-1">Delivery continues as normal</div>
                                    </div>
                                )}
                                <h2 className="text-2xl font-bold">{selectedVendor.storeName}</h2>
                                <p className="text-sm text-gray-400">{selectedVendor.address}</p>
                            </div>
                            <button onClick={() => setSelectedVendor(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">✕</button>
                        </div>

                        {/* Inventory Scroll */}
                        <div className="p-6 overflow-y-auto grow">
                            {selectedVendor.inventory?.length === 0 ? (
                                <p className="text-center py-10 text-gray-500">This shop has no items listed yet.</p>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {selectedVendor.inventory.map(item => (
                                        <div key={item._id} className="bg-riderDark/30 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                                            <div className="aspect-square bg-black/20 rounded-lg overflow-hidden">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm truncate">{item.name}</h4>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-riderBlue font-bold text-sm">KES {item.price}</span>
                                                    <div className="flex items-center gap-2">
                                                        {user && (
                                                            <button
                                                                onClick={() => saveToWishlist(selectedVendor, item)}
                                                                className={`text-xs px-2 py-1 rounded border ${isWishlisted(selectedVendor?._id, item)
                                                                    ? "bg-white/10 text-gray-300 border-white/10 cursor-default"
                                                                    : "bg-white/10 hover:bg-white/20 text-gray-200 border-white/10"
                                                                    }`}
                                                                disabled={isWishlisted(selectedVendor?._id, item)}
                                                            >
                                                                {isWishlisted(selectedVendor?._id, item) ? "Saved" : "Save"}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => addItemToCart(item)}
                                                            className="bg-riderBlue hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
                                                        >
                                                            + Add
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Cart Footer */}
                        {cart.length > 0 && (
                            <div className="p-4 border-t border-riderBlue/10 bg-riderDark/80 backdrop-blur-md flex justify-between items-center shrink-0">
                                <div className="text-sm">
                                    <span className="font-bold">{cart.length} items</span>
                                    <span className="mx-2">•</span>
                                    <span className="text-riderBlue font-bold">Total: KES {cart.reduce((sum, item) => sum + item.price, 0)}</span>
                                </div>
                                <button
                                    onClick={placeOrder}
                                    className={`font-bold py-2 px-6 rounded-xl transition-all shadow-lg ${typeof serverHour === "number" && serverHour >= 21 ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-green-600 hover:bg-green-700 animate-pulse text-white"}`}
                                >
                                    {typeof serverHour === "number" && serverHour >= 21 ? `Place Late Order (${cart.length})` : `Place Order (${cart.length})`}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* PAYMENT MODAL (If Not Paid) */}
            {activeOrder && !activeOrder.isDeliveryFeePaid && (
                <div className="fixed inset-0 bg-riderBlack/90 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-riderBlue/10 text-riderBlue rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                            💳
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {activeOrder.status === 'PAYMENT_PENDING' ? "Complete Your Order" : "Delivery Fee Payment"}
                        </h2>
                        <p className="text-gray-500 mb-6">
                            {activeOrder.status === 'PAYMENT_PENDING'
                                ? <span>To confirm your order with <span className="font-bold text-gray-900">KES {activeOrder.amount}</span>, please complete payment.</span>
                                : <span>To process your order, please pay the cashless delivery fee of <span className="text-riderBlue font-bold">KES 50</span>.</span>
                            }
                        </p>

                        {(paymentConfirmed || activeOrder.status === "PAYMENT_CONFIRMED") && (
                            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">
                                Payment confirmed
                                <div className="text-xs text-green-600 mt-1">Waiting for vendor acceptance</div>
                            </div>
                        )}

                        <div className="bg-gray-50 p-4 rounded-xl mb-6 text-left border border-gray-100">
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-600">Items Total (Pay Rider Later):</span>
                                <span className="font-bold">KES {activeOrder.goodsTotal}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-2">
                                <span className="text-gray-900 font-bold">Delivery Fee (Pay Now):</span>
                                <span className="text-riderBlue font-bold">KES 50</span>
                            </div>
                        </div>

                        {/* Payment Method Tabs */}
                        {!(paymentConfirmed || activeOrder.status === "PAYMENT_CONFIRMED") && (
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => setPaymentMethod('mpesa')}
                                    className={`flex-1 py-2 rounded-lg font-bold text-sm border ${paymentMethod === 'mpesa'
                                        ? 'bg-green-600 text-white border-green-600'
                                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    M-Pesa
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('google_pay')}
                                    className={`flex-1 py-2 rounded-lg font-bold text-sm border ${paymentMethod === 'google_pay'
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    Google Pay
                                </button>
                            </div>
                        )}

                        {paymentMethod === 'mpesa' && !(paymentConfirmed || activeOrder.status === "PAYMENT_CONFIRMED") ? (
                            <div className="animate-in fade-in">
                                <input
                                    type="tel"
                                    placeholder="2547..."
                                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl mb-4 text-center font-mono font-bold text-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    value={mpesaPhone}
                                    onChange={(e) => setMpesaPhone(e.target.value)}
                                />
                                <button
                                    onClick={() => payDeliveryFee('mpesa')}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105"
                                >
                                    Pay KES 50 (M-Pesa)
                                </button>
                            </div>
                        ) : !(paymentConfirmed || activeOrder.status === "PAYMENT_CONFIRMED") && (
                            <div className="h-16 flex items-center justify-center animate-in fade-in">
                                {/* Helper wrapper for Google Pay */}
                                <GooglePayButton
                                    environment="TEST" // Switch to PRODUCTION
                                    paymentRequest={{
                                        apiVersion: 2,
                                        apiVersionMinor: 0,
                                        allowedPaymentMethods: [
                                            {
                                                type: 'CARD',
                                                parameters: {
                                                    allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                                                    allowedCardNetworks: ['MASTERCARD', 'VISA'],
                                                },
                                                tokenizationSpecification: {
                                                    type: 'PAYMENT_GATEWAY',
                                                    parameters: {
                                                        gateway: 'example', // Replace with real gateway
                                                        gatewayMerchantId: 'exampleGatewayMerchantId', // Replace
                                                    },
                                                },
                                            },
                                        ],
                                        merchantInfo: {
                                            merchantId: '12345678901234567890',
                                            merchantName: 'Neighborhood Rider',
                                        },
                                        transactionInfo: {
                                            totalPriceStatus: 'FINAL',
                                            totalPriceLabel: 'Total',
                                            totalPrice: '50.00',
                                            currencyCode: 'KES',
                                            countryCode: 'KE',
                                        },
                                    }}
                                    onLoadPaymentData={paymentRequest => {
                                        console.log('load payment data', paymentRequest);
                                        payDeliveryFee('google_pay', paymentRequest);
                                    }}
                                    buttonColor="black"
                                    buttonType="pay"
                                    style={{ width: '100%' }}
                                />
                            </div>
                        )}

                        <p className="text-xs text-gray-400 mt-4">
                            Secured payment. You will receive updates here.
                        </p>
                    </div>
                </div>
            )}

            {/* Live Map Section (Persistent) - Only show if active order AND paid */}
            {activeOrder && activeOrder.isDeliveryFeePaid && (
                <div className="w-full max-w-4xl mx-auto px-6 mb-12 relative z-10">
                    <div className="bg-riderBlack/90 backdrop-blur-md rounded-3xl p-6 border border-riderBlue/10 shadow-xl">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-riderLight italic">
                            <span className="text-3xl">📍</span> Live Delivery Map
                        </h2>

                        {["CANCELLED", "REFUNDED"].includes(activeOrder.status) && (activeOrder.paid || activeOrder.isDeliveryFeePaid) && (
                            <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-3 text-sm font-semibold">
                                Refund initiated
                                <div className="text-xs text-blue-600 mt-1">Funds will return based on your payment provider</div>
                            </div>
                        )}

                        {(paymentConfirmed || activeOrder.status === "PAYMENT_CONFIRMED") && (
                            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">
                                Payment confirmed
                                <div className="text-xs text-green-600 mt-1">Waiting for vendor acceptance</div>
                            </div>
                        )}

                        {activeOrder.status === "READY_FOR_PICKUP" && (
                            <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-3 text-sm font-semibold">
                                Looking for nearby rider
                                {typeof serverHour === "number" && serverHour >= 21 && (
                                    <div className="text-xs text-blue-600 mt-1">
                                        Late order in progress
                                        <div className="text-[11px] text-blue-600">Delivery continues as normal</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {typeof serverHour === "number" && serverHour >= 21 && ["PAYMENT_CONFIRMED", "VENDOR_ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "RIDER_ASSIGNED", "ON_THE_WAY"].includes(activeOrder.status) && (
                            <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl px-4 py-3 text-sm font-semibold">
                                Late order in progress
                                <div className="text-xs mt-1">Delivery continues as normal</div>
                                {!["DELIVERED", "CANCELLED", "REFUNDED"].includes(activeOrder.status) && (
                                    <button
                                        onClick={async () => {
                                            if (!window.confirm("Cancel this order?")) return;
                                            try {
                                                await apiFetch(`/api/orders/${activeOrder._id}/cancel`, {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
                                                    body: JSON.stringify({ reason: "USER_CANCELLED" })
                                                });
                                                setActiveOrder(prev => prev ? { ...prev, status: "CANCELLED" } : prev);
                                            } catch (e) { }
                                        }}
                                        className="mt-2 text-xs bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full font-bold"
                                    >
                                        Cancel Order
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Payment Instruction Banner */}
                        {activeOrder.status === 'RIDER_ASSIGNED' && (
                            <div className="mb-6 bg-yellow-50 border border-yellow-200 p-6 rounded-2xl text-center shadow-sm animate-in fade-in slide-in-from-top-4">
                                <h3 className="text-xl font-extrabold text-yellow-700 mb-2">Rider is at the shop! 🏬</h3>
                                <p className="text-gray-700 font-bold mb-4">
                                    Payment required to proceed with pickup.
                                </p>
                                <p className="text-sm text-gray-500 mt-4">Complete payment to continue.</p>
                            </div>
                        )}

                        <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-2xl text-center shadow-sm">
                            <p className="text-blue-900 font-bold text-sm">
                                ℹ️ Delivery Fee Paid.
                            </p>
                        </div>

                        {/* Confirm Receipt Button - Replaces OTP */}
                        {activeOrder.status === 'DELIVERED' && !activeOrder.isReceived && (
                            <div className="mb-6 bg-white border-2 border-dashed border-riderBlue/30 p-6 rounded-2xl text-center shadow-sm">
                                <h3 className="text-lg font-bold text-gray-800 mb-2">Have you received your order?</h3>
                                <p className="text-sm text-gray-500 mb-4">Please confirm only after you have physically received your items.</p>
                                <button
                                    onClick={async () => {
                                        if (window.confirm("Are you sure you have received these items?")) {
                                            try {
                                                await apiFetch("/api/orders/confirm-receipt", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
                                                    body: JSON.stringify({ orderId: activeOrder._id })
                                                });
                                                alert("Receipt Confirmed! The rider can now complete the order.");
                                                setActiveOrder(prev => ({ ...prev, isReceived: true }));
                                            } catch (err) { console.error(err); alert("Connection error"); }
                                        }
                                    }}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all animate-pulse"
                                >
                                    ✅ I Have Received My Order
                                </button>
                            </div>
                        )}

                        {activeOrder.isReceived && (
                            <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-2xl text-center">
                                <p className="text-green-700 font-bold">You have confirmed receipt! 🎉</p>
                                <p className="text-xs text-gray-500">Waiting for rider to close the order.</p>
                            </div>
                        )}

                        {activeOrder.status === 'DELIVERED' && (
                            <div className="mb-6 bg-green-50 border border-green-200 p-6 rounded-2xl text-center shadow-sm animate-in fade-in slide-in-from-top-4">
                                <h3 className="text-xl font-extrabold text-green-700 mb-2">Rider has Arrived! 🏁</h3>
                                <p className="text-gray-700 font-bold mb-4">
                                    Please complete payment to finish delivery.
                                </p>
                                <p className="text-sm text-gray-500">Payment confirmation completes the order.</p>
                            </div>
                        )}

                        {activeOrder.status === 'DELIVERED' && (
                            <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-2xl text-center">
                                <p className="text-green-700 font-bold">Delivered successfully</p>
                                {activeOrder.lateOrder && (
                                    <p className="text-xs text-gray-500 mt-1">Delivery continues as normal</p>
                                )}
                            </div>
                        )}

                        {activeOrder.riderId && activeOrder.riderId.phone && (
                            <div className="flex gap-3 mb-6">
                                <a
                                    href={`tel:${activeOrder.riderId.phone}`}
                                    className="flex-1 bg-green-600/20 border border-green-500/50 hover:bg-green-600/40 text-green-400 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                                >
                                    <span>📞</span> Call Rider
                                </a>
                                <a
                                    href={`https://wa.me/${activeOrder.riderId.phone.replace('+', '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 bg-green-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:bg-green-600 transition-all"
                                >
                                    <span>💬</span> WhatsApp
                                </a>
                            </div>
                        )}
                        <LiveMap
                            role="user"
                            socket={socket}
                            order={activeOrder}
                            deliveryLocation={activeOrder?.dropoff?.location?.coordinates ? {
                                lat: activeOrder.dropoff.location.coordinates[1],
                                lng: activeOrder.dropoff.location.coordinates[0]
                            } : activeOrder?.dropoffLat ? { // Fallback if regular fields used
                                lat: activeOrder.dropoffLat,
                                lng: activeOrder.dropoffLng
                            } : null}
                        />

                        {/* Order Timeline */}
                        <div className="mt-6 bg-riderDark/50 backdrop-blur-md rounded-2xl p-4 border border-riderBlue/10">
                            <h3 className="text-sm font-bold text-riderLight mb-3">Order Timeline</h3>
                            {(() => {
                                const steps = [
                                    { key: "PAYMENT_CONFIRMED", label: "Payment confirmed" },
                                    { key: "VENDOR_ACCEPTED", label: "Vendor accepted" },
                                    { key: "PREPARING", label: "Preparing" },
                                    { key: "RIDER_ASSIGNED", label: "Rider assigned" },
                                    { key: "ON_THE_WAY", label: "On the way" },
                                    { key: "DELIVERED", label: "Delivered" }
                                ];
                                const reached = new Set((timeline || []).map(t => t.toStatus));
                                return (
                                    <div className="space-y-2">
                                        {steps.map(step => (
                                            <div key={step.key} className="flex items-center justify-between text-xs">
                                                <span className={reached.has(step.key) ? "text-green-400 font-bold" : "text-gray-500"}>
                                                    {step.label}
                                                </span>
                                                <span className={reached.has(step.key) ? "text-green-400" : "text-gray-600"}>
                                                    {reached.has(step.key) ? "✓" : "•"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Review Triggers */}
                        {activeOrder.status === 'DELIVERED' && !activeOrder.isReviewed && (
                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => {
                                        setReviewTarget({ id: activeOrder.vendorId._id || activeOrder.vendorId, role: 'vendor', name: 'Vendor', orderId: activeOrder._id });
                                        setShowReviewModal(true);
                                    }}
                                    className="flex-1 bg-white border border-gray-200 text-riderLight font-bold py-3 px-4 rounded-xl shadow-sm hover:bg-gray-50 transition-all font-mono"
                                >
                                    ★ Review Vendor
                                </button>
                                {activeOrder.riderId && (
                                    <button
                                        onClick={() => {
                                            setReviewTarget({ id: activeOrder.riderId._id || activeOrder.riderId, role: 'rider', name: 'Rider', orderId: activeOrder._id });
                                            setShowReviewModal(true);
                                        }}
                                        className="flex-1 bg-riderBlue text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:bg-blue-600 transition-all font-mono"
                                    >
                                        ★ Review Rider
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}


            <Footer />

            {/* FAQ Modal */}
            {showFaq && (
                <div className="fixed inset-0 bg-riderBlack/90 z-[100] flex items-center justify-center p-4">
                    <div className="bg-riderBlack border border-riderBlue/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col text-riderLight">
                        <div className="p-6 border-b border-riderBlue/10 flex justify-between items-center bg-riderDark/50">
                            <h2 className="text-xl font-bold">Frequently Asked Questions</h2>
                            <button onClick={() => setShowFaq(false)} className="w-8 h-8 rounded-full bg-riderDark/50 hover:bg-riderDark/50 flex items-center justify-center font-bold text-riderLight">✕</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <h2 className="text-2xl font-bold mb-4 font-style-italic">Common Questions</h2>
                            {/* Accordion would go here */}
                            <div className="space-y-4">
                                {faqs.map(faq => (
                                    <div key={faq._id} className="bg-riderDark/50 p-4 rounded-xl border border-riderBlue/10 text-left hover:bg-riderDark/70 transition-colors">
                                        <h4 className="font-bold text-riderBlue mb-2">{faq.question}</h4>
                                        <p className="text-gray-700">{faq.answer}</p>
                                    </div>
                                ))}
                                {faqs.length === 0 && <p className="text-gray-500">Loading FAQs...</p>}
                            </div>

                            <div className="mt-8 pt-6 border-t border-riderBlue/10 text-center">
                                <p className="text-sm text-gray-500">Still need help? Chat with our support team!</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* REVIEW MODAL */}
            {showReviewModal && reviewTarget && (
                <div className="fixed inset-0 bg-riderBlack/90 z-[110] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 relative">
                        <button
                            onClick={() => setShowReviewModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold"
                        >
                            ✕
                        </button>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                            Rate your {reviewTarget.role === 'vendor' ? 'Service' : 'Delivery'}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            How was your experience with {reviewTarget.name}?
                        </p>

                        <ReviewForm
                            orderId={reviewTarget.orderId}
                            targetId={reviewTarget.id}
                            targetRole={reviewTarget.role}
                            onReviewSubmit={() => {
                                setShowReviewModal(false);
                                alert("Thanks for your review!");
                                // Optionally refresh order state
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
