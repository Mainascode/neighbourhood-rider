import { useState, useEffect, useCallback } from "react";
import { API_URL } from "../../lib/config";

const FinanceDashboard = () => {
    const [activeTab, setActiveTab] = useState("queue");
    const [queue, setQueue] = useState([]);
    const [history, setHistory] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [ledgerUser, setLedgerUser] = useState(null); // Selected user for ledger
    const [ledger, setLedger] = useState([]);

    const fetchQueue = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/admin/finance/queue`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await res.json();
            setQueue(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    const fetchBatches = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/admin/finance/batches`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await res.json();
            setBatches(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/admin/finance/history`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await res.json();
            setHistory(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (activeTab === "queue") fetchQueue();
        if (activeTab === "batches") fetchBatches();
        if (activeTab === "history") fetchHistory();
    }, [activeTab, fetchQueue, fetchBatches, fetchHistory]);

    const handlePayNow = async (walletId) => {
        if (!window.confirm("Are you sure you want to process this payment manually?")) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/finance/pay/${walletId}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                fetchQueue();
            } else {
                alert(data.message);
            }
        } catch (e) { alert("Payment Error"); }
    };

    const handleViewLedger = async (user) => {
        setLedgerUser(user);
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/finance/ledger/${user._id}`, { // user._id is walletId in queue response
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await res.json();
            setLedger(data);
        } catch (e) { alert("Failed to fetch ledger"); }
        finally { setLoading(false); }
    };

    const handleProcessBatch = async () => {
        if (!window.confirm("Run End-of-Day Payout Job for ALL eligible wallets?")) return;
        try {
            const res = await fetch(`${API_URL}/api/payments/payouts/process`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                fetchQueue();
            } else alert("Batch process failed");
        } catch (e) { alert("Error connecting"); }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Finance & Payouts 💸</h1>
            {loading && <p className="text-gray-500 animate-pulse">Loading data...</p>}

            {/* Tabs */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => { setActiveTab("queue"); setLedgerUser(null); }}
                    className={`px-6 py-2 rounded-full font-bold ${activeTab === "queue" && !ledgerUser ? "bg-riderBlue text-white" : "bg-white text-gray-600 border border-gray-200"}`}
                >
                    Payout Queue
                </button>
                <button
                    onClick={() => { setActiveTab("history"); setLedgerUser(null); }}
                    className={`px-6 py-2 rounded-full font-bold ${activeTab === "history" ? "bg-riderBlue text-white" : "bg-white text-gray-600 border border-gray-200"}`}
                >
                    Payout History
                </button>
                <button onClick={handleProcessBatch} className="ml-auto bg-green-600 text-white px-6 py-2 rounded-full font-bold hover:bg-green-700 shadow-sm">
                    ⚡ Run Batch Payout
                </button>
            </div>

            {/* LEDGER VIEW */}
            {ledgerUser && (
                <div className="mb-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Ledger: {ledgerUser.name} <span className="text-sm font-normal text-gray-500">({ledgerUser.role})</span></h2>
                        <button onClick={() => setLedgerUser(null)} className="text-gray-400 hover:text-gray-600 font-bold">Close ✕</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100/50 text-gray-500 text-xs uppercase sticky top-0">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Description</th>
                                    <th className="p-3 text-right">Amount</th>
                                    <th className="p-3">Ref</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {ledger.map(txn => (
                                    <tr key={txn._id} className="text-sm hover:bg-gray-50">
                                        <td className="p-3">{new Date(txn.createdAt).toLocaleString()}</td>
                                        <td className={`p-3 font-bold uppercase text-xs ${txn.type === 'earning' ? 'text-green-600' : 'text-red-500'}`}>{txn.type}</td>
                                        <td className="p-3 text-gray-600">{txn.description}</td>
                                        <td className={`p-3 text-right font-bold ${txn.type === 'earning' ? 'text-green-600' : 'text-red-500'}`}>
                                            {txn.type === 'earning' || txn.type === 'deposit' ? '+' : '-'} {txn.amount}
                                        </td>
                                        <td className="p-3 font-mono text-xs text-gray-400">{txn.referenceId}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* QUEUE */}
            {activeTab === "queue" && !ledgerUser && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-100">
                            <tr>
                                <th className="p-4">User</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Payout Detail</th>
                                <th className="p-4 text-right">Balance</th>
                                <th className="p-4 text-right">Pending</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {queue.map(item => (
                                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <p className="font-bold text-gray-800">{item.name}</p>
                                        <p className="text-xs text-gray-400 font-mono">{item.userId}</p>
                                    </td>
                                    <td className="p-4"><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold uppercase">{item.role}</span></td>
                                    <td className="p-4 font-mono text-sm">{item.phone || "N/A"}</td>
                                    <td className="p-4 text-right font-bold text-green-600">KES {item.balance}</td>
                                    <td className="p-4 text-right text-gray-400">KES {item.pendingBalance}</td>
                                    <td className="p-4 text-center flex justify-center gap-2">
                                        <button
                                            onClick={() => handleViewLedger(item)}
                                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-lg text-xs font-bold"
                                        >
                                            Ledger
                                        </button>
                                        <button
                                            onClick={() => handlePayNow(item._id)}
                                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-md"
                                        >
                                            Pay Now
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {queue.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-400 italic">No payouts pending.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* BATCHES */}
            {activeTab === "batches" && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-100">
                            <tr>
                                <th className="p-4">Date</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Total Amount</th>
                                <th className="p-4 text-center">Transactions</th>
                                <th className="p-4">Logs</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {batches.map(batch => (
                                <tr key={batch._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 text-sm font-mono text-gray-600">
                                        {new Date(batch.startedAt).toLocaleDateString()}<br />
                                        <span className="text-xs text-gray-400">{new Date(batch.startedAt).toLocaleTimeString()}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${batch.status === 'completed' ? 'bg-green-100 text-green-700' : batch.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {batch.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold text-gray-800">KES {batch.totalAmount}</td>
                                    <td className="p-4 text-center">
                                        <span className="text-green-600 font-bold">{batch.successfulCount}</span> / <span className="text-red-500 font-bold">{batch.failedCount}</span>
                                    </td>
                                    <td className="p-4 text-xs text-gray-500 max-w-xs truncate" title={batch.logs.join('\n')}>
                                        {batch.logs[batch.logs.length - 1]}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* HISTORY */}
            {activeTab === "history" && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-100">
                            <tr>
                                <th className="p-4">Date</th>
                                <th className="p-4">Description</th>
                                <th className="p-4 text-right">Amount</th>
                                <th className="p-4">Reference (M-Pesa)</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {history.map(item => (
                                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 text-sm text-gray-600">{new Date(item.createdAt).toLocaleString()}</td>
                                    <td className="p-4 font-medium">{item.description}</td>
                                    <td className="p-4 text-right font-bold">KES {item.amount}</td>
                                    <td className="p-4 font-mono text-sm text-blue-600">{item.referenceId}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default FinanceDashboard;
