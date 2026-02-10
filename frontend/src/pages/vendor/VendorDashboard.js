import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../lib/config";
import { useNavigate } from "react-router-dom";
import { useNotify } from "../../context/NotificationContext";
import ReviewList from "../../components/ReviewList";

import { socket } from "../../lib/socket"; // Ensure socket imported

export default function VendorDashboard({ initialTab = "overview" }) {
    const { user } = useAuth();
    const { notify, enableNotifications } = useNotify();
    const navigate = useNavigate();

    const [vendor, setVendor] = useState(null);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [inventory, setInventory] = useState([]);
    const [orders, setOrders] = useState([]); // State for orders
    const [newItem, setNewItem] = useState({ name: "", price: "", image: "" });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        if (!user) return;
        fetchVendorProfile();
        fetchInventory();

        socket.on(`vendor:order:new`, (newOrder) => {
            notify("New Order Received! 🔔", "success");
            setOrders(prev => [newOrder, ...prev]);
        });

        return () => {
            socket.off("vendor:order:new");
        };
    }, [user, notify]);

    const fetchVendorProfile = async () => {
        try {
            const res = await fetch(`${API_URL}/api/vendors/me`, { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setVendor(data);
            }
        } catch (err) { console.error(err); }
    };

    const handleUpdateShop = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/vendors/me`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    storeName: vendor.storeName,
                    phone: vendor.phone,
                    description: vendor.description,
                    address: vendor.address,
                    isManuallyClosed: vendor.isManuallyClosed
                })
            });

            const data = await res.json();
            if (res.ok) {
                setVendor(data);
                notify("Shop settings updated!", "success");
            } else {
                notify(data.message || "Update failed", "error");
            }
        } catch (err) {
            console.error(err);
            notify("Connection error", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteShop = async () => {
        const confirmDelete = window.confirm("Are you sure you want to delete your shop? This cannot be undone.");
        if (!confirmDelete) return;

        const doubleCheck = window.prompt("Type 'DELETE' to confirm.");
        if (doubleCheck !== "DELETE") return;

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/vendors/me`, {
                method: "DELETE",
                credentials: "include"
            });
            const data = await res.json();
            if (res.ok) {
                notify("Shop deleted. Redirecting...", "info");
                setTimeout(() => {
                    navigate("/orders"); // Redirect to user page
                    window.location.reload(); // Force reload to refresh role
                }, 2000);
            } else {
                notify(data.message || "Delete failed", "error");
            }
        } catch (err) {
            console.error(err);
            notify("Connection error", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestRider = async (order) => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/vendors/orders/dispatch`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ orderId: order._id })
            });

            const data = await res.json();

            if (res.ok) {
                notify(data.message, "success");
                // Update local order status
                setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: 'RIDER_ASSIGNED' } : o));
            } else {
                notify(data.message || "Failed to find rider", "error");
            }
        } catch (err) {
            console.error(err);
            notify("Connection Error", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchInventory = async () => {
        try {
            const res = await fetch(`${API_URL}/api/vendors/inventory`, { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setInventory(data);
            }
        } catch (err) { console.error(err); }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewItem(prev => ({ ...prev, image: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddItem = async () => {
        if (!newItem.name || !newItem.price) return notify("Name and Price required", "error");
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/vendors/inventory`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(newItem)
            });
            if (res.ok) {
                const updatedInventory = await res.json();
                setInventory(updatedInventory);
                setNewItem({ name: "", price: "", image: "" });
                notify("Item added successfully", "success");
            } else {
                notify("Failed to add item (Is your shop approved?)", "error");
            }
        } catch (err) {
            notify("Error adding item", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!window.confirm("Delete this item?")) return;
        try {
            const res = await fetch(`${API_URL}/api/vendors/inventory/${itemId}`, {
                method: "DELETE", credentials: "include"
            });
            if (res.ok) {
                const updatedInventory = await res.json();
                setInventory(updatedInventory);
                notify("Item deleted", "info");
            }
        } catch (err) { console.error(err); }
    }

    return (
        <div className="min-h-screen bg-transparent text-riderLight font-sans">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 pt-24">
                {/* Header */}
                <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm mb-8 flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-riderBlue/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <div className="relative z-10">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-riderMaroon to-orange-500">
                            {vendor?.storeName || "My Shop"}
                        </h1>
                        <p className="text-gray-500 font-medium">Vendor Dashboard</p>
                    </div>
                    <div className="flex gap-4 relative z-10">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${vendor?.isOpen && !vendor?.isManuallyClosed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <span className={`w-2.5 h-2.5 rounded-full ${vendor?.isOpen && !vendor?.isManuallyClosed ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                            <span className={`${vendor?.isOpen && !vendor?.isManuallyClosed ? 'text-green-700' : 'text-red-700'} font-bold text-sm`}>
                                {vendor?.isOpen && !vendor?.isManuallyClosed ? 'Accepting Orders' : 'Temporarily Closed'}
                            </span>
                        </div>
                        <button onClick={() => setActiveTab('settings')} className="bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-bold transition-all text-gray-600">
                            Settings
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                    {['Overview', 'Orders', 'Inventory', 'Reviews', 'Settings'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab.toLowerCase())}
                            className={`px-6 py-2 rounded-full font-bold transition-all whitespace-nowrap ${activeTab === tab.toLowerCase()
                                ? "bg-riderBlue text-white shadow-lg shadow-riderBlue/30"
                                : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* SETTINGS TAB */}
                {activeTab === 'settings' && vendor && (
                    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl shadow-riderBlue/5 space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">Shop Settings</h2>
                                <p className="text-gray-500 text-sm">Update your store details and visibility.</p>
                            </div>

                            <form onSubmit={handleUpdateShop} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <div>
                                            <span className="block font-bold text-gray-700">Store Status</span>
                                            <span className="text-sm text-gray-500">{vendor.isManuallyClosed ? "Not accepting orders" : "Accepting orders"}</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={!vendor.isManuallyClosed} onChange={e => setVendor({ ...vendor, isManuallyClosed: !e.target.checked })} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-2">Store Name</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-riderBlue focus:bg-white transition-all font-bold text-riderLight"
                                            value={vendor.storeName}
                                            onChange={e => setVendor({ ...vendor, storeName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-2">Phone</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-riderBlue focus:bg-white transition-all font-bold text-riderLight"
                                            value={vendor.phone}
                                            onChange={e => setVendor({ ...vendor, phone: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-2">Address / Location</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-riderBlue focus:bg-white transition-all font-bold text-riderLight"
                                            value={vendor.address}
                                            onChange={e => setVendor({ ...vendor, address: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-2">Description</label>
                                        <textarea
                                            rows="3"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-riderBlue focus:bg-white transition-all font-medium text-riderLight"
                                            value={vendor.description}
                                            onChange={e => setVendor({ ...vendor, description: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={enableNotifications}
                                    type="button"
                                    className="w-full bg-riderBlue text-white font-bold py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                >
                                    🔔 Enable Push Notifications
                                </button>
                                <p className="text-xs text-gray-500 text-center">Get notified when new orders arrive.</p>

                                <button
                                    disabled={loading}
                                    type="submit"
                                    className="w-full bg-riderBlue hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-riderBlue/20"
                                >
                                    {loading ? "Saving Changes..." : "Save Changes"}
                                </button>
                            </form>

                            <div className="pt-6 border-t border-gray-100">
                                <h3 className="text-red-500 font-bold mb-2">Danger Zone</h3>
                                <p className="text-gray-400 text-sm mb-4">Deleting your shop is irreversible. All inventory and history will be lost.</p>
                                <button
                                    onClick={handleDeleteShop}
                                    className="border border-red-200 text-red-500 hover:bg-red-50 font-bold py-3 px-6 rounded-xl text-sm transition-all"
                                >
                                    Delete Shop
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                {/* ORDERS TAB */}
                {activeTab === 'orders' && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold mb-4">Incoming Orders</h2>
                        {orders.length === 0 ? (
                            <p className="text-gray-500 py-10 text-center bg-riderDark/20 rounded-xl">No active orders right now.</p>
                        ) : (
                            orders.map(order => (
                                <div key={order._id} className="bg-riderDark/40 backdrop-blur-md p-6 rounded-2xl border border-riderBlue/10 flex flex-col md:flex-row justify-between items-start gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="bg-riderBlue text-white text-xs font-bold px-2 py-1 rounded">#{order._id.slice(-6)}</span>
                                            <span className="text-gray-400 text-xs">{new Date(order.createdAt).toLocaleTimeString()}</span>
                                            {order.status === 'PAYMENT_CONFIRMED' && <span className="text-yellow-500 text-xs font-bold animate-pulse">● New Request</span>}
                                        </div>

                                        <div className="mb-4">
                                            <h4 className="font-bold text-riderLight mb-1">Items:</h4>
                                            <ul className="text-sm text-gray-300 space-y-1">
                                                {order.items?.map((item, i) => (
                                                    <li key={i}>• {item.name} <span className="text-gray-500 text-xs ml-1">(KES {item.price})</span></li>
                                                ))}
                                            </ul>
                                            <p className="mt-2 font-bold text-riderBlue">Total: KES {order.amount}</p>
                                        </div>

                                        <div className="bg-black/20 p-3 rounded-lg text-sm text-gray-400">
                                            <p>📍 <span className="font-bold text-gray-300">Deliver to:</span> {typeof order.dropoff === 'string' ? order.dropoff : order.dropoff?.address}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 w-full md:w-auto">
                                        {/* Actions */}
                                        {order.status === 'PAYMENT_CONFIRMED' && (
                                            <div className="flex flex-col gap-2">
                                                {!order.goodsPaid && (
                                                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl text-center">
                                                        <p className="text-yellow-500 text-xs font-bold mb-2">Has Customer Paid KES {order.goodsTotal || order.amount}?</p>
                                                        <button
                                                            onClick={async () => {
                                                                if (!window.confirm("Confirm you have received payment for goods?")) return;
                                                                try {
                                                                    const res = await fetch(`${API_URL}/api/orders/${order._id}/confirm-goods`, {
                                                                        method: "PATCH", credentials: "include"
                                                                    });
                                                                    if (res.ok) {
                                                                        setOrders(prev => prev.map(o => o._id === order._id ? { ...o, goodsPaid: true } : o));
                                                                        notify("Payment Confirmed! You can now request a rider.", "success");
                                                                    }
                                                                } catch (e) { notify("Error confirming payment", "error"); }
                                                            }}
                                                            className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold px-4 py-2 rounded-lg w-full transition-all"
                                                        >
                                                            Confirm Payment 💰
                                                        </button>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => handleRequestRider(order)}
                                                    disabled={!order.goodsPaid}
                                                    className={`font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 whitespace-nowrap ${order.goodsPaid ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
                                                >
                                                    <span>🚴</span> Request Nearby Rider
                                                </button>
                                            </div>
                                        )}
                                        {order.status === 'READY_FOR_PICKUP' && order.goodsPaid && (
                                            <button
                                                onClick={() => handleRequestRider(order)}
                                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95 whitespace-nowrap"
                                            >
                                                <span>🚴</span> Request Nearby Rider
                                            </button>
                                        )}
                                        {order.status === 'RIDER_ASSIGNED' && (
                                            <div className="bg-riderBlue/20 text-riderBlue border border-riderBlue/20 px-4 py-2 rounded-xl text-center">
                                                <p className="font-bold text-sm">Rider Assigned</p>
                                                <p className="text-xs">Waiting for pickup...</p>
                                            </div>
                                        )}
                                        <button className="bg-riderDark/50 hover:bg-riderDark text-gray-400 px-4 py-2 rounded-xl text-sm transition-all">
                                            Reject Order
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="space-y-6">
                        {/* Add Item Form */}
                        <div className="bg-riderDark/40 backdrop-blur-md p-6 rounded-2xl border border-riderBlue/10">
                            <h3 className="font-bold text-xl mb-4 text-riderLight">Add New Item</h3>
                            <div className="grid md:grid-cols-4 gap-4 items-end">
                                <div className="md:col-span-2">
                                    <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Item Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Fresh Tomatoes (1kg)"
                                        className="w-full bg-riderDark/50 border border-riderBlue/10 rounded-xl px-4 py-2 outline-none focus:border-riderBlue"
                                        value={newItem.name}
                                        onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Price (KES)</label>
                                    <input
                                        type="number"
                                        placeholder="100"
                                        className="w-full bg-riderDark/50 border border-riderBlue/10 rounded-xl px-4 py-2 outline-none focus:border-riderBlue"
                                        value={newItem.price}
                                        onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Image</label>
                                    <input
                                        type="file"
                                        className="w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-riderBlue/10 file:text-riderBlue hover:file:bg-riderBlue/20"
                                        onChange={e => handleImageUpload(e)}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleAddItem}
                                disabled={loading}
                                className="mt-4 bg-riderBlue hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-lg text-sm"
                            >
                                {loading ? "Adding..." : "+ Add to Inventory"}
                            </button>
                        </div>

                        {/* Inventory Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {inventory.length === 0 ? (
                                <div className="col-span-full text-center py-10 text-gray-500">
                                    <p className="text-2xl mb-2">🥕</p>
                                    <p>Your inventory is empty. Add your first item!</p>
                                </div>
                            ) : (
                                inventory.map(item => (
                                    <div key={item._id} className="relative group bg-riderDark/40 backdrop-blur-md p-3 rounded-xl border border-riderBlue/10 hover:border-riderBlue/30 transition-all">
                                        <div className="aspect-square bg-black/20 rounded-lg mb-2 overflow-hidden relative">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                                            )}
                                            <button
                                                onClick={() => handleDeleteItem(item._id)}
                                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <span className="text-xs">✕</span>
                                            </button>
                                        </div>
                                        <h4 className="font-bold text-sm truncate">{item.name}</h4>
                                        <p className="text-riderBlue font-bold text-xs">KES {item.price}</p>
                                        <div className="absolute top-2 left-2 bg-green-500/20 text-green-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                                            In Stock
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* REVIEWS TAB */}
                {activeTab === 'reviews' && vendor && (
                    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xl shadow-riderBlue/5">
                            <h2 className="text-2xl font-bold mb-4">Customer Reviews</h2>
                            <ReviewList targetId={vendor._id} type="vendor" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}



/* StatCard removed as unused */
