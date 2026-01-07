import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FaLock, FaArrowLeft } from "react-icons/fa";

export default function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return setError("Passwords do not match");
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/reset-password/${token}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => navigate("/login"), 3000);
            } else {
                setError(data.message || "Failed to reset password");
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
                {success ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                            🎉
                        </div>
                        <h3 className="text-xl font-bold text-green-500 mb-2">Password Reset Successful!</h3>
                        <p className="text-gray-500 mb-6">Redirecting you to login in a moment...</p>
                        <Link to="/login" className="text-riderBlue hover:underline font-bold">Go to Login Now</Link>
                    </div>
                ) : (
                    <>
                        <Link to="/login" className="text-sm text-gray-500 hover:text-riderLight flex items-center gap-2 mb-6">
                            <FaArrowLeft /> Back to Login
                        </Link>

                        <h1 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-riderBlue to-riderMaroon bg-clip-text text-transparent">
                            New Password
                        </h1>
                        <p className="text-gray-500 mb-8">Enter your new secure password below.</p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-center text-sm font-bold border border-red-500/20">{error}</div>}

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">New Password</label>
                                <div className="relative">
                                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-riderDark/50 border border-riderBlue/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-riderBlue focus:ring-1 focus:ring-riderBlue transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">Confirm Password</label>
                                <div className="relative">
                                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-riderDark/50 border border-riderBlue/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-riderBlue focus:ring-1 focus:ring-riderBlue transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-riderBlue to-riderMaroon text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-riderBlue/20 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {loading ? "Resetting..." : "Set New Password"}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
