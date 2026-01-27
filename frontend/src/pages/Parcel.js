import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../lib/config";
import Footer from "../components/Footer";

export default function Parcel() {
    const { user } = useAuth();
    const [pickup, setPickup] = useState("");
    const [dropoff, setDropoff] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    // Mock lat/lng for now
    const [pickupCoords] = useState([36.8219, -1.2921]);

    const handleSendParcel = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/orders/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
                credentials: "include",
                body: JSON.stringify({
                    items: [{ name: description, price: 0 }], // Parcel description as item
                    address: pickup,
                    pickupLng: pickupCoords[0],
                    pickupLat: pickupCoords[1],
                    dropoff: { address: dropoff }
                })
            });

            if (res.ok) {
                alert("Parcel Request Sent! Finding a rider...");
                // Redirect or show track status
            } else {
                alert("Failed to request rider.");
            }
        } catch (err) {
            console.error(err);
            alert("Error sending request.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="min-h-screen pt-24 pb-12 px-4 md:px-6 bg-gray-50 flex flex-col items-center">
                <div className="max-w-2xl w-full bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                    <div className="text-center mb-8">
                        <span className="text-4xl mb-2 block">📦</span>
                        <h1 className="text-3xl font-extrabold text-riderLight">Send a Parcel</h1>
                        <p className="text-gray-500">Fast, eco-friendly delivery for your items.</p>
                    </div>

                    <form onSubmit={handleSendParcel} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">What are you sending?</label>
                            <input
                                required
                                placeholder="e.g. Keys, Documents, Laptop Charger"
                                className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-riderMaroon/20"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Pickup Location</label>
                                <input
                                    required
                                    placeholder="Where is the item?"
                                    className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-riderMaroon/20"
                                    value={pickup}
                                    onChange={e => setPickup(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Dropoff Location</label>
                                <input
                                    required
                                    placeholder="Where is it going?"
                                    className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-riderMaroon/20"
                                    value={dropoff}
                                    onChange={e => setDropoff(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-3">
                            <span className="text-2xl">🌱</span>
                            <p className="text-sm text-green-800 font-bold">
                                Your rider will use an electric bike or bicycle. Zero emissions!
                            </p>
                        </div>

                        <button
                            disabled={loading}
                            className="w-full bg-riderMaroon text-white font-bold py-4 rounded-xl shadow-lg hover:bg-rose-700 transition-all disabled:opacity-50"
                        >
                            {loading ? "Finding Rider..." : "Find Rider Now"}
                        </button>
                    </form>
                </div>
            </div>
            <Footer />
        </>
    );
}
