import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../index.css";
import { useNotify } from "../context/NotificationContext";
import { API_URL } from "../lib/config";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function JoinVendor() {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        storeName: "",
        phone: "",
        location: "",
        address: "",
        description: "",
        logo: "",
        coverImage: "",
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const { notify } = useNotify();
    const navigate = useNavigate();

    const [status, setStatus] = useState(null); // null, 'pending', 'approved', 'rejected'

    useEffect(() => {
        // TODO: Create a check status endpoint for vendors if needed similar to riders
        // For now, we assume if they are here, they might be new.
    }, [user]);

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, [field]: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Very basic location parsing for now - ideally use a map picker
            // Mocking coords for Nairobi if text is provided
            const mockCoords = [36.8219, -1.2921];

            const res = await fetch(`${API_URL}/api/vendors/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    ...formData,
                    location: mockCoords // sending mock coords or handled by backend? Backend expects [lng, lat]
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setSubmitted(true);
                setStatus("pending");
                notify("Store Application submitted successfully!", "success");
            } else {
                notify(data.message || "Registration failed", "error");
            }
        } catch (err) {
            console.error(err);
            notify("Something went wrong. Please try again.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-transparent text-riderLight pt-20 md:pt-24 pb-12 px-4 md:px-6">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-8 md:mb-10">
                        <h1 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4">
                            Sell on <span className="text-riderMaroon">Neighborhood Rider</span>
                        </h1>
                        <p className="text-gray-600 text-base md:text-lg px-2">
                            Grow your business. Reach more customers in your mtaa.
                        </p>
                    </div>

                    {!user ? (
                        <div className="bg-white border border-gray-200 p-8 rounded-3xl shadow-sm text-center">
                            <h2 className="text-2xl font-bold mb-4">Login Required</h2>
                            <p className="text-gray-500 mb-6">You must be logged in to register your shop.</p>
                            <button onClick={() => navigate("/login")} className="bg-riderBlue hover:bg-blue-600 px-6 py-3 rounded-xl font-bold transition-all text-white shadow-lg shadow-riderBlue/20">
                                Go to Login
                            </button>
                        </div>
                    ) : (submitted || status ? (
                        <div className="bg-white border border-gray-200 p-8 rounded-3xl shadow-sm text-center">
                            <div className="text-6xl mb-4">⏳</div>
                            <h2 className="text-2xl font-bold text-yellow-500 mb-2">Application Pending</h2>
                            <p className="text-gray-500">
                                Your shop details are under review. We will notify you once approved.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-8 rounded-3xl shadow-xl shadow-riderBlue/5 space-y-6">

                            <div>
                                <label className="block text-sm font-bold text-gray-500 mb-2">Store Name</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-riderBlue focus:bg-white transition-all text-riderLight"
                                    placeholder="Mama Mboga Fresh"
                                    value={formData.storeName}
                                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 mb-2">Phone Number</label>
                                    <input
                                        required
                                        type="tel"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-riderBlue focus:bg-white transition-all text-riderLight"
                                        placeholder="0712 345 678"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 mb-2">Store Location / Area</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-riderBlue focus:bg-white transition-all text-riderLight"
                                        placeholder="e.g. South B Shopping Center"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-500 mb-2">Description</label>
                                <textarea
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-riderBlue focus:bg-white transition-all text-riderLight"
                                    rows="3"
                                    placeholder="We sell fresh vegetables and fruits..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-500 mb-2">Store Logo / Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-riderBlue/10 file:text-riderBlue hover:file:bg-riderBlue/20"
                                    onChange={(e) => handleFileChange(e, "logo")}
                                />
                            </div>

                            <button
                                disabled={loading}
                                className="w-full bg-riderBlue hover:bg-violet-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-riderBlue/30 transform hover:-translate-y-1 disabled:opacity-50"
                            >
                                {loading ? "Submit Application..." : "Create Shop"}
                            </button>

                        </form>
                    ))}
                </div>
            </div>
            <Footer />
        </>
    );
}
