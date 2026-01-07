import { useState } from "react";
import { API_URL } from "../../lib/config";
import { Link } from "react-router-dom";
import { FaEnvelope, FaArrowLeft } from "react-icons/fa";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {

            const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok) {
                setSent(true);
            } else {
                setError(data.message || "Failed to send email");
            }
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 text-riderLight relative overflow-hidden">
            {/* Background Blob */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-riderMaroon/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-riderBlue/20 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="bg-riderBlack/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-riderBlue/20 w-full max-w-md relative z-10">
                <Link to="/login" className="text-sm text-gray-500 hover:text-riderLight flex items-center gap-2 mb-6">
                    <FaArrowLeft /> Back to Login
                </Link>

                <h1 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-riderBlue to-riderMaroon bg-clip-text text-transparent">
                    Forgot Password?
                </h1>
                <p className="text-gray-500 mb-8">Enter your email and we'll send you a link to reset your password.</p>

                {sent ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                            ✉️
                        </div>
                        <h3 className="text-xl font-bold text-green-500 mb-2">Check your email</h3>
                        <p className="text-gray-500 mb-6">We have sent a reset link to <strong>{email}</strong></p>
                        <p className="text-xs text-gray-600">(Since this is a demo, check the server terminal console for the link!)</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-center text-sm font-bold border border-red-500/20">{error}</div>}

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">Email Address</label>
                            <div className="relative">
                                <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-riderDark/50 border border-riderBlue/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-riderBlue focus:ring-1 focus:ring-riderBlue transition-all"
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-riderBlue to-riderMaroon text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-riderBlue/20 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {loading ? "Sending..." : "Send Reset Link"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
