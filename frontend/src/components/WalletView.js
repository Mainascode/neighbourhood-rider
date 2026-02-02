import { useState, useEffect } from "react";
import { API_URL } from "../lib/config";
import { FaHistory, FaArrowUp, FaArrowDown, FaCog, FaSave, FaUniversity, FaMobileAlt } from "react-icons/fa";

export default function WalletView({ role = "user" }) {
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [txLoading, setTxLoading] = useState(true);

    // Setup / Edit Payout Details
    const [isEditing, setIsEditing] = useState(false);
    const [payoutForm, setPayoutForm] = useState({
        provider: "mpesa",
        accountNumber: "",
        accountName: ""
    });

    useEffect(() => {
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        try {
            setTxLoading(true);
            const res = await fetch(`${API_URL}/api/wallet/me`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await res.json();
            if (res.ok) {
                setWallet(data.wallet);
                setTransactions(data.transactions);
                if (data.wallet.payoutDetails) {
                    setPayoutForm(data.wallet.payoutDetails);
                } else {
                    setIsEditing(true); // Force setup if empty
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setTxLoading(false);
        }
    };

    const handleSaveSetup = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/wallet/payout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify(payoutForm)
            });
            const data = await res.json();
            if (res.ok) {
                setWallet(data.wallet);
                setIsEditing(false);
                alert("Payout details saved! ✅");
            } else {
                alert("Error: " + data.message);
            }
        } catch (err) {
            console.error(err);
            alert("Connection error");
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        if (!withdrawAmount || Number(withdrawAmount) < 10) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/wallet/withdraw`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                // Use stored account number as the "phone" or destination
                body: JSON.stringify({
                    amount: Number(withdrawAmount),
                    phone: wallet.payoutDetails?.accountNumber
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(`Withdrawal Initiated to ${wallet.payoutDetails.provider.toUpperCase()} (${wallet.payoutDetails.accountNumber}).`);
                setWithdrawAmount("");
                fetchWalletData();
            } else {
                alert("Failed: " + data.message);
            }
        } catch (err) {
            console.error(err);
            alert("Error processing withdrawal.");
        } finally {
            setLoading(false);
        }
    };

    if (!wallet && txLoading) return <div className="p-8 text-center text-gray-500">Loading Wallet...</div>;
    if (!wallet) return <div className="p-8 text-center text-red-500">Wallet not found. Contact Support.</div>;

    const isAdmin = role === "admin";
    const hasSetup = wallet.payoutDetails?.accountNumber;

    return (
        <div className="flex flex-col gap-6 animate-fade-in text-gray-800">
            {/* Setup / Settings Section */}
            {!isAdmin && (
                <div className={`p-6 rounded-2xl border ${!hasSetup || isEditing ? "bg-blue-50 border-blue-200 shadow-lg" : "bg-white border-gray-100"}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold flex items-center gap-2 text-lg">
                            <FaCog className={isEditing ? "text-blue-500 animate-spin-slow" : "text-gray-400"} />
                            Wallet Settings
                        </h3>
                        {hasSetup && !isEditing && (
                            <button onClick={() => setIsEditing(true)} className="text-sm font-bold text-blue-600 hover:underline">
                                Edit Details
                            </button>
                        )}
                    </div>

                    {/* Setup Form */}
                    {isEditing ? (
                        <form onSubmit={handleSaveSetup} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Provider</label>
                                    <select
                                        className="w-full p-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={payoutForm.provider}
                                        onChange={e => setPayoutForm({ ...payoutForm, provider: e.target.value })}
                                    >
                                        <option value="mpesa">M-Pesa</option>
                                        <option value="bank">Bank Transfer</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                        {payoutForm.provider === 'mpesa' ? "M-Pesa Number" : "Account Number"}
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder={payoutForm.provider === 'mpesa' ? "e.g., 0712345678" : "Bank Account Number"}
                                        value={payoutForm.accountNumber}
                                        onChange={e => setPayoutForm({ ...payoutForm, accountNumber: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                {hasSetup && (
                                    <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700 font-bold">Cancel</button>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold shadow-md flex items-center gap-2 transition-all"
                                >
                                    <FaSave /> {loading ? "Saving..." : "Save Details"}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${wallet.payoutDetails.provider === 'mpesa' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {wallet.payoutDetails.provider === 'mpesa' ? <FaMobileAlt /> : <FaUniversity />}
                                </div>
                                <div>
                                    <p className="font-bold capitalize text-gray-800">{wallet.payoutDetails.provider} Payout</p>
                                    <p className="text-gray-500 font-mono tracking-wider">{wallet.payoutDetails.accountNumber}</p>
                                </div>
                            </div>
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Active</span>
                        </div>
                    )}
                </div>
            )}

            {/* Balance Card */}
            <div className={`relative overflow-hidden rounded-3xl p-8 text-white shadow-2xl ${isAdmin ? "bg-gradient-to-br from-gray-900 to-black border border-gray-800" : "bg-gradient-to-br from-riderBlue to-blue-900 border border-riderBlue/20"
                }`}>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <p className="text-gray-300 font-bold uppercase tracking-widest text-xs mb-2">
                            {isAdmin ? "Company Revenue" : "Available Balance"}
                        </p>
                        <h1 className="text-5xl font-black tracking-tighter">
                            KES {wallet.balance.toLocaleString()}
                        </h1>
                        <p className="text-sm text-gray-300 mt-2 flex items-center gap-2 justify-center md:justify-start">
                            {isAdmin ? <span>Total Platform Earnings</span> : <span>Available to Withdraw</span>}
                        </p>
                    </div>

                    {!isAdmin && !isEditing && hasSetup && (
                        <form onSubmit={handleWithdraw} className="bg-white/10 p-5 rounded-2xl backdrop-blur-md border border-white/10 w-full md:w-auto">
                            <label className="block text-xs font-bold text-gray-200 mb-2 uppercase">Amount (KES)</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    className="bg-black/40 border border-white/20 text-white placeholder-gray-400 rounded-xl px-4 py-2 w-full md:w-40 focus:outline-none focus:border-white transition-colors"
                                    value={withdrawAmount}
                                    onChange={e => setWithdrawAmount(e.target.value)}
                                    max={wallet.balance}
                                    min="10"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={loading || wallet.balance < 10}
                                    className="bg-white text-riderBlue font-bold px-6 py-2 rounded-xl hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                >
                                    {loading ? "..." : "Withdraw"}
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-300 mt-2 text-center md:text-left">
                                To: {wallet.payoutDetails?.accountNumber} • Min KES 10
                            </p>
                        </form>
                    )}

                    {!isAdmin && !hasSetup && !isEditing && (
                        <div className="bg-orange-500/20 p-4 rounded-xl border border-orange-500/30 text-orange-200 text-sm font-bold">
                            ⚠️ Setup wallet to withdraw
                        </div>
                    )}
                </div>

                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
            </div>

            {/* Transactions List */}
            <div className="bg-white/50 backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-xl overflow-hidden flex-1 min-h-[400px]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white/40">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FaHistory className="text-riderBlue" /> Transaction History
                    </h2>
                </div>

                <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
                    {transactions.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-2xl">💸</div>
                            <p>No transactions found.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {transactions.map(tx => (
                                <div key={tx._id} className="p-5 flex justify-between items-center hover:bg-white/60 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm transition-transform group-hover:scale-110 ${tx.type === 'withdrawal' || tx.type.includes('deduction')
                                            ? 'bg-red-50 text-red-500'
                                            : 'bg-green-50 text-green-500'
                                            }`}>
                                            {tx.type === 'withdrawal' || tx.type.includes('deduction') ? <FaArrowUp className="rotate-45" /> : <FaArrowDown className="rotate-45" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 capitalize text-sm md:text-base">
                                                {tx.description || tx.type.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                                {new Date(tx.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`font-black font-mono text-lg ${tx.type === 'withdrawal' || tx.type.includes('deduction')
                                        ? 'text-red-500'
                                        : 'text-green-600'
                                        }`}>
                                        {tx.type === 'withdrawal' || tx.type.includes('deduction') ? '-' : '+'}
                                        KES {tx.amount.toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
