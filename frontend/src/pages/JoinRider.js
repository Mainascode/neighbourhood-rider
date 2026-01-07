import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../index.css";
import { useNotify } from "../context/NotificationContext";
import { API_URL } from "../lib/config";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Import useAuth

export default function JoinRider() {
    const { user } = useAuth(); // Get user
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        location: "",
        idNumber: "",
        idPicture: "",
        riderPicture: "",
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const { notify } = useNotify();
    const navigate = useNavigate();

    const [status, setStatus] = useState(null); // null, 'pending', 'approved', 'rejected'

    useEffect(() => {
        const checkStatus = async () => {
            if (!user) return; // Only check status if user is logged in
            try {
                const res = await fetch(`${API_URL}/api/riders/me`, {
                    credentials: "include", // Use cookies
                });
                if (res.ok) {
                    const data = await res.json();
                    setStatus(data.status);
                    setSubmitted(true); // Treat as submitted to hide form
                }
            } catch (err) {
                // If 404 or error, assume not registered
            }
        };
        checkStatus();
    }, [user]); // Re-run when user changes

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
            const res = await fetch(`${API_URL}/api/riders/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include", // Use cookies
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                setSubmitted(true);
                setStatus("pending");
                notify("Application submitted successfully!", "success");
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
            <div className="min-h-screen bg-transparent text-riderLight pt-24 pb-12 px-6">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-bold mb-4">
                            Kuwa <span className="text-riderMaroon">Rider</span> wa Mtaa
                        </h1>
                        <p className="text-gray-600 text-lg">
                            Earn money by delivering groceries and parcels in your neighborhood.
                            Be your own boss.
                        </p>
                    </div>

                    {!user ? (
                        <div className="bg-riderBlack/90 backdrop-blur-md border border-riderBlue/10 p-8 rounded-2xl text-center">
                            <h2 className="text-2xl font-bold mb-4">Login Required</h2>
                            <p className="text-gray-600 mb-6">You must be logged in to apply as a rider.</p>
                            <button onClick={() => navigate("/login")} className="bg-riderBlue hover:bg-blue-600 px-6 py-3 rounded-xl font-bold transition-all">
                                Go to Login
                            </button>
                        </div>
                    ) : (submitted || status ? (
                        <div className={`border p-8 rounded-2xl text-center ${status === 'approved' ? 'bg-green-900/20 border-green-500/20' :
                            status === 'rejected' ? 'bg-red-500/10 border-red-500/20' :
                                'bg-yellow-500/10 border-yellow-500/20'
                            }`}>
                            <div className="text-6xl mb-4">
                                {status === 'approved' ? '🎉' : status === 'rejected' ? '❌' : '⏳'}
                            </div>

                            {status === 'approved' && (
                                <>
                                    <h2 className="text-2xl font-bold text-green-400 mb-2">You are Approved!</h2>
                                    <p className="text-gray-700">Karibu kwa Team! You can now start accepting orders.</p>
                                    <button
                                        onClick={() => navigate("/dashboard")}
                                        className="mt-6 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition-colors font-bold"
                                    >
                                        Go to Dashboard
                                    </button>
                                </>
                            )}

                            {status === 'rejected' && (
                                <>
                                    <h2 className="text-2xl font-bold text-red-400 mb-2">Application Rejected</h2>
                                    <p className="text-gray-700">Sorry, your application update was not successful at this time.</p>
                                </>
                            )}

                            {(status === 'pending' || !status) && (
                                <>
                                    <h2 className="text-2xl font-bold text-yellow-400 mb-2">Application Pending</h2>
                                    <p className="text-gray-700">
                                        Application yako imetumwa usingoje. Tutakucheki shortly for onboarding.
                                        Check back later.
                                    </p>
                                </>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="bg-riderBlack/90 backdrop-blur-md border border-riderBlue/10 p-8 rounded-2xl space-y-6">

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-2">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full bg-riderDark/40 border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-riderBlue text-riderLight"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-2">Phone Number</label>
                                    <input
                                        required
                                        type="tel"
                                        className="w-full bg-riderDark/40 border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-riderBlue text-riderLight"
                                        placeholder="0712 345 678"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">Preferred Location / Mtaa</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full bg-riderDark/40 border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-riderBlue text-riderLight"
                                    placeholder="e.g. Kileleshwa, Westlands, South B"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-2">National ID Number</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full bg-riderDark/40 border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-riderBlue text-riderLight"
                                        placeholder="12345678"
                                        value={formData.idNumber}
                                        onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-2">Upload ID Picture</label>
                                    <input
                                        required
                                        type="file"
                                        accept="image/*"
                                        className="w-full bg-riderDark/40 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-riderBlue file:text-riderLight hover:file:bg-blue-600"
                                        onChange={(e) => handleFileChange(e, "idPicture")}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">Your Photo (Selfie or Cyclist Photo)</label>
                                <input
                                    required
                                    type="file"
                                    accept="image/*"
                                    className="w-full bg-riderDark/40 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-riderBlue file:text-riderLight hover:file:bg-blue-600"
                                    onChange={(e) => handleFileChange(e, "riderPicture")}
                                />
                                <p className="text-xs text-gray-500 mt-1">Please upload a clear photo of yourself for verification.</p>
                            </div>

                            <button
                                disabled={loading}
                                className="w-full bg-riderBlue hover:bg-blue-600 text-riderLight font-bold py-4 rounded-xl transition-all shadow-lg shadow-riderBlue/20 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Submitting..." : "Submit Application"}
                            </button>

                        </form>
                    ))}
                </div>
            </div>
            <Footer />
        </>
    );
}
