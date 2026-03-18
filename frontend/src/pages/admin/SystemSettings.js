import { useState, useEffect } from "react";
import { API_URL } from "../../lib/config";
import { FaSave, FaPercent, FaMotorcycle, FaHandHoldingUsd } from "react-icons/fa";

export default function SystemSettings({ notify }) { // Pass notify from parent
    const [settings, setSettings] = useState({
        riderBaseFee: 50,
        riderPerKmFee: 30,
        serviceFee: 30,
        vendorCommissionRate: 0
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/settings`, { credentials: "include" });
            const data = await res.json();
            if (res.ok) {
                // Filter out non-setting fields if any
                const { riderBaseFee, riderPerKmFee, serviceFee, vendorCommissionRate } = data;
                setSettings({ riderBaseFee, riderPerKmFee, serviceFee, vendorCommissionRate });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(settings)
            });
            // const data = await res.json(); // Unused
            if (res.ok) {
                notify("Settings updated successfully! ✅", "success");
            } else {
                notify("Failed to update settings", "error");
            }
        } catch (err) {
            console.error(err);
            notify("Connection error", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-riderLight">Platform Fees & Commissions</h3>
                <p className="text-gray-500 text-sm">Real-time configuration of system pricing logic.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">

                {/* Rider Fee Section */}
                <div className="bg-riderDark/40 backdrop-blur-md p-6 rounded-2xl border border-riderBlue/10">
                    <h4 className="font-bold flex items-center gap-2 mb-4 text-riderBlue">
                        <FaMotorcycle /> Rider Pricing
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Base Fee (KES)</label>
                            <input
                                type="number"
                                className="w-full bg-riderDark/50 border border-riderBlue/20 rounded-xl p-3 text-white outline-none focus:border-riderBlue"
                                value={settings.riderBaseFee}
                                onChange={e => setSettings({ ...settings, riderBaseFee: Number(e.target.value) })}
                            />
                            <p className="text-[10px] text-gray-500 mt-1">Starting fee for every delivery.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Per KM Fee (KES)</label>
                            <input
                                type="number"
                                className="w-full bg-riderDark/50 border border-riderBlue/20 rounded-xl p-3 text-white outline-none focus:border-riderBlue"
                                value={settings.riderPerKmFee}
                                onChange={e => setSettings({ ...settings, riderPerKmFee: Number(e.target.value) })}
                            />
                            <p className="text-[10px] text-gray-500 mt-1">Added for every kilometer.</p>
                        </div>
                    </div>
                </div>

                {/* Commissions Section */}
                <div className="bg-riderDark/40 backdrop-blur-md p-6 rounded-2xl border border-riderBlue/10">
                    <h4 className="font-bold flex items-center gap-2 mb-4 text-green-400">
                        <FaHandHoldingUsd /> Revenue & Commissions
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Service Fee (KES)</label>
                            <input
                                type="number"
                                className="w-full bg-riderDark/50 border border-riderBlue/20 rounded-xl p-3 text-white outline-none focus:border-riderBlue"
                                value={settings.serviceFee}
                                onChange={e => setSettings({ ...settings, serviceFee: Number(e.target.value) })}
                            />
                            <p className="text-[10px] text-gray-500 mt-1">Fixed fee paid by customer used for platform revenue.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vendor Commission (%)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    className="w-full bg-riderDark/50 border border-riderBlue/20 rounded-xl p-3 text-white outline-none focus:border-riderBlue pr-10"
                                    value={settings.vendorCommissionRate}
                                    onChange={e => setSettings({ ...settings, vendorCommissionRate: Number(e.target.value) })}
                                />
                                <FaPercent className="absolute right-4 top-4 text-gray-500 text-xs" />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">Percentage deducted from Vendor earnings.</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-riderBlue hover:bg-blue-600 text-riderLight px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <FaSave /> {loading ? "Saving..." : "Save Configuration"}
                    </button>
                </div>
            </form>
        </div>
    );
}
