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
    const { notify } = useNotify(); // Assuming useNotify hook exists or is imported, wait, let me check imports. Ah, used in AdminDashboard, need to import here or pass.
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

    const handleOpenFaq = async () => {
        setShowFaq(true);
        if (faqs.length === 0) {
            try {
                const res = await fetch(`${API_URL}/api/faqs`);
                const data = await res.json();
                setFaqs(data);
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-transparent text-riderLight relative">
            <Navbar />

            <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-6 text-center z-10 w-full">

                {/* Help Button - Static on Mobile, Absolute on Desktop */}
                <div className="w-full flex justify-end mb-6 md:absolute md:top-24 md:right-10">
                    <button
                        onClick={handleOpenFaq}
                        className="bg-riderDark/50 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-riderBlue/20 text-xs md:text-sm font-bold text-riderLight hover:bg-riderDark/70 transition-all flex items-center gap-2"
                    >
                        <span>❓</span> Help & FAQs
                    </button>
                </div>

                <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-riderLight">
                    Start Your Order
                </h1>
                <p className="text-base md:text-lg text-gray-600 mb-8 max-w-lg px-2">
                    Click the chat icon below to tell us what you need. Our cyclists are ready!
                </p>

                <div className="bg-riderBlack/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-riderBlue/10 max-w-4xl w-full">
                    {/* VENDOR GRID */}
                    <h2 className="text-xl font-bold mb-6 text-left border-b border-white/10 pb-2">Select a Shop</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                        {vendors.length === 0 ? (
                            <p className="col-span-full text-gray-500 py-10">Searching for nearby shops...</p>
                        ) : (
                            vendors.map((vendor) => (
                                <div
                                    key={vendor._id}
                                    onClick={() => handleSelectVendor(vendor)}
                                    className="bg-riderBlack/40 backdrop-blur-sm p-4 rounded-xl border border-riderBlue/10 flex flex-col items-center gap-3 hover:bg-riderBlue/5 transition-all group cursor-pointer hover:-translate-y-1 hover:shadow-lg"
                                >
                                    <div className="w-full h-32 bg-white/5 rounded-lg overflow-hidden relative">
                                        <img
                                            src={vendor.logo || `https://ui-avatars.com/api/?name=${vendor.storeName}&background=random`}
                                            alt={vendor.storeName}
                                            className="w-full h-full object-cover"
                                        />
                                        {!vendor.isOpen && (
                                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                <span className="text-red-500 font-bold uppercase text-sm border border-red-500 px-2 py-1 rounded">Closed</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center w-full">
                                        <h3 className="font-bold text-riderLight text-lg truncate w-full">{vendor.storeName}</h3>
                                        <p className="text-xs text-gray-400 truncate">{vendor.address || "Nearby"}</p>
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

            {/* Live Map Section (Persistent) - Only show if active order */}
            {activeOrder && (
                <div className="w-full max-w-4xl mx-auto px-6 mb-12 relative z-10">
                    <div className="bg-riderBlack/90 backdrop-blur-md rounded-3xl p-6 border border-riderBlue/10 shadow-xl">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-riderLight italic">
                            <span className="text-3xl">📍</span> Live Delivery Map
                        </h2>

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
