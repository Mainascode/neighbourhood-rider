import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import ChatBot from "../components/Chatbot";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { socket } from "../lib/socket";
import LiveMap from "../components/LiveMap";
import { API_URL } from "../lib/config";
import { useNotify } from "../context/NotificationContext";

export default function Order() {
    const { user } = useAuth();

    const [showFaq, setShowFaq] = useState(false);
    const [faqs, setFaqs] = useState([]);
    const [activeOrder, setActiveOrder] = useState(null);
    const [vendors, setVendors] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [cart, setCart] = useState([]);
    // const { notify } = useNotify(); // Removing unused notify
    // Wait, Order.js doesn't import useNotify. Let me fix imports first in next call. 
    // For now I'll use simple alert or console if notify missing, but better to add it.

    // Check for active order on mount
    useEffect(() => {
        fetchVendors();
        const checkOrder = async () => {
            try {
                const res = await fetch(`${API_URL}/api/orders/my`, {
                    credentials: "include",
                    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
                });
                const data = await res.json();
                if (data && data.length > 0) {
                    // Find active order
                    const active = data.find(o => o.status === 'DELIVERING' || o.status === 'PENDING' || o.status === 'ASSIGNED');
                    if (active) setActiveOrder(active);
                }
            } catch (e) { }
        };
        checkOrder();
    }, []);

    const fetchVendors = async () => {
        try {
            const res = await fetch(`${API_URL}/api/vendors/nearby`);
            const data = await res.json();
            setVendors(data);
        } catch (err) { console.error(err); }
    };

    const handleSelectVendor = (vendor) => {
        setSelectedVendor(vendor);
        setCart([]); // Clear cart when switching vendors
    };

    const addItemToCart = (item) => {
        setCart(prev => [...prev, item]);
    };

    const placeOrder = async () => {
        if (!user) return alert("Please login first!"); // Replace with notify later
        if (cart.length === 0) return;

        // Get location (Mock for now or use previous logic)
        const locationConfirmed = window.confirm("Use your current profile location for delivery?");
        if (!locationConfirmed) return;

        try {
            const res = await fetch(`${API_URL}/api/orders/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
                credentials: "include",
                body: JSON.stringify({
                    vendorId: selectedVendor._id,
                    items: cart,
                    address: "My Profile Address", // Backend should handle or fetch from user
                    pickupLng: selectedVendor.location.coordinates[0],
                    pickupLat: selectedVendor.location.coordinates[1],
                    dropoff: { address: "User Location" } // Mock
                })
            });

            if (res.ok) {
                const data = await res.json();
                setActiveOrder(data.order);
                setSelectedVendor(null);
                setCart([]);
                alert("Order Placed! Waiting for Vendor/Rider.");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to place order.");
        }
    };

    /* handleOpenFaq removed as unused */

    const payDeliveryFee = async () => {
        if (!activeOrder) return;
        try {
            const res = await fetch(`${API_URL}/api/orders/pay-delivery`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: activeOrder._id, paymentMethod: "mpesa" })
            });
            const data = await res.json();
            if (data.success) {
                // Update local state
                setActiveOrder(data.order);
                alert("Delivery Fee Paid! Rider will be assigned.");
            } else {
                alert("Payment failed: " + data.message);
            }
        } catch (err) {
            console.error(err);
            alert("Payment error.");
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-transparent text-riderLight relative">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                        {vendors.length === 0 ? (
                            <p className="col-span-full text-gray-400 py-10 text-center italic">Searching for nearby shops...</p>
                        ) : (
                            vendors.map((vendor) => (
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
                                        {!vendor.isOpen && (
                                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                                                <span className="text-red-500 font-bold uppercase text-xs border border-red-500 px-3 py-1 rounded-full bg-white">Closed</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-riderLight text-lg truncate">{vendor.storeName}</h3>
                                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded">4.8 ★</span>
                                        </div>
                                        <p className="text-sm text-gray-500 truncate mb-4">{vendor.address || "Nearby"}</p>
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
                                                    <button
                                                        onClick={() => addItemToCart(item)}
                                                        className="bg-riderBlue hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
                                                    >
                                                        + Add
                                                    </button>
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
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-lg animate-pulse"
                                >
                                    Place Order ({cart.length})
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
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Delivery Fee Payment</h2>
                        <p className="text-gray-500 mb-6">
                            To process your order, please pay the cashless delivery fee of <span className="text-riderBlue font-bold">KES 50</span>.
                        </p>

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

                        <button
                            onClick={payDeliveryFee}
                            className="w-full bg-riderBlue hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105"
                        >
                            Pay KES 50 (Cashless)
                        </button>
                        <p className="text-xs text-gray-400 mt-4">
                            Secured by M-Pesa. You will pay the rider KES {activeOrder.goodsTotal} upon delivery.
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

                        {/* Payment Instruction Banner */}
                        {activeOrder.status === 'picking_up' && (
                            <div className="mb-6 bg-yellow-50 border border-yellow-200 p-6 rounded-2xl text-center shadow-sm animate-in fade-in slide-in-from-top-4">
                                <h3 className="text-xl font-extrabold text-yellow-700 mb-2">Rider is at the shop! 🏬</h3>
                                <p className="text-gray-700 font-bold mb-4">
                                    Please pay <span className="text-black text-xl">KES {activeOrder.goodsTotal}</span> directly to the Vendor.
                                </p>
                                {/* Vendor Details Logic would require populating vendor details in activeOrder or fetching them */}
                                {activeOrder.vendorId && (
                                    <div className="bg-white p-4 rounded-xl border border-yellow-100 shadow-sm max-w-xs mx-auto">
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">VENDOR M-PESA</p>
                                        <p className="text-2xl font-mono font-black text-gray-800 tracking-wider">
                                            {typeof activeOrder.vendorId === 'object' ? activeOrder.vendorId.phone : "Ask Rider for Number"}
                                        </p>
                                    </div>
                                )}
                                <p className="text-sm text-gray-500 mt-4">The rider will collect your items once payment is confirmed by the vendor.</p>
                            </div>
                        )}

                        <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-2xl text-center shadow-sm">
                            <p className="text-blue-900 font-bold text-sm">
                                ℹ️ Delivery Fee Paid.
                            </p>
                        </div>

                        {/* OTP Display - Only show if fee is paid */}
                        {activeOrder.completionOtp && (
                            <div className="mb-6 bg-white border-2 border-dashed border-riderBlue/30 p-4 rounded-2xl text-center">
                                <p className="text-xs text-uppercase text-gray-500 font-bold tracking-widest mb-1">DELIVERY CODE</p>
                                <p className="text-4xl font-mono font-black text-riderBlue tracking-[0.5em]">{activeOrder.completionOtp}</p>
                                <p className="text-xs text-gray-400 mt-2">Give this code to the rider <strong>after</strong> you receive your items.</p>
                            </div>
                        )}

                        {activeOrder.status === 'delivered' && (
                            <div className="mb-6 bg-green-50 border border-green-200 p-6 rounded-2xl text-center shadow-sm animate-in fade-in slide-in-from-top-4">
                                <h3 className="text-xl font-extrabold text-green-700 mb-2">Rider has Arrived! 🏁</h3>
                                <p className="text-gray-700 font-bold mb-4">
                                    Please pay <span className="text-black text-xl">KES {activeOrder.goodsTotal}</span> directly to the rider via M-Pesa or Cash.
                                </p>
                                <p className="text-sm text-gray-500">The rider will complete the order once payment is received.</p>
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
                            deliveryLocation={activeOrder?.pickup?.location?.coordinates ? {
                                lat: activeOrder.pickup.location.coordinates[1],
                                lng: activeOrder.pickup.location.coordinates[0]
                            } : null}
                        />
                    </div>
                </div>
            )}

            <ChatBot user={user} />
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
        </div>
    );
}
