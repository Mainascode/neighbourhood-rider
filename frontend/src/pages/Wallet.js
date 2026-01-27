import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../lib/config";

export default function Wallet() {
    const { user } = useAuth();
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        try {
            const res = await fetch(`${API_URL}/api/wallet/me`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await res.json();
            if (res.ok) {
                setWallet(data.wallet);
                setTransactions(data.transactions);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/wallet/withdraw`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ amount: Number(withdrawAmount), phone: user.phone })
            });
            const data = await res.json();
            if (data.success) {
                alert("Withdrawal Initiated! Check your M-Pesa.");
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

    if (!wallet) return <div className="text-center pt-24">Loading Wallet...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-24 px-4">
            <Navbar />

            <div className="w-full max-w-4xl">
                {/* Balance Card */}
                <div className="bg-riderBlack text-white rounded-3xl p-8 mb-8 shadow-2xl relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-2">Total Balance</p>
                            <h1 className="text-5xl font-black tracking-tighter">KES {wallet.balance.toLocaleString()}</h1>
                            <p className="text-sm text-gray-400 mt-2">Available for Instant Withdrawal</p>
                        </div>

                        <form onSubmit={handleWithdraw} className="bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/10 w-full md:w-auto">
                            <label className="block text-xs font-bold text-gray-300 mb-2">WITHDRAW TO M-PESA</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    className="bg-black/50 border border-gray-600 text-white rounded-xl px-4 py-2 w-32 focus:outline-none focus:border-riderBlue"
                                    value={withdrawAmount}
                                    onChange={e => setWithdrawAmount(e.target.value)}
                                    max={wallet.balance}
                                    min="10"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={loading || wallet.balance < 10}
                                    className="bg-riderBlue hover:bg-blue-600 text-white font-bold px-6 py-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? "..." : "Withdraw"}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Min: KES 10. Sent to {user.phone}</p>
                        </form>
                    </div>
                    {/* Decor */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-riderBlue/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                </div>

                {/* Transactions */}
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Transaction History</h2>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {transactions.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 italic">No transactions yet.</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {transactions.map(tx => (
                                <div key={tx._id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${tx.type === 'withdrawal' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
                                            }`}>
                                            {tx.type === 'withdrawal' ? '↘️' : '↗️'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 capitalize">{tx.type.replace('_', ' ')}</p>
                                            <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()} • {tx.description}</p>
                                        </div>
                                    </div>
                                    <div className={`font-black font-mono ${tx.type === 'withdrawal' || tx.type.includes('deduction') ? 'text-red-500' : 'text-green-600'
                                        }`}>
                                        {tx.type === 'withdrawal' || tx.type.includes('deduction') ? '-' : '+'} KES {tx.amount}
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
