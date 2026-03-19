import { useState, useEffect } from "react";
import { API_URL } from "../../lib/config";
import { FaSave, FaCloudRain, FaSun } from "react-icons/fa";

export default function SystemSettings({ notify }) {
  const [settings, setSettings] = useState({
    isRaining: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/settings`, { credentials: "include" });
        const data = await res.json();
        if (res.ok) {
          setSettings({
            isRaining: Boolean(data.isRaining),
          });
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        notify("Weather mode updated successfully.", "success");
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
        <h3 className="text-xl font-bold text-riderLight">Delivery Weather Control</h3>
        <p className="text-gray-500 text-sm">This changes the live delivery fee used during checkout in Ruaka - Gathigi Estate.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-riderDark/40 backdrop-blur-md p-6 rounded-2xl border border-riderBlue/10">
          <h4 className="font-bold flex items-center gap-2 mb-4 text-riderBlue">
            {settings.isRaining ? <FaCloudRain /> : <FaSun />} Weather Mode
          </h4>

          <div className="grid md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSettings({ isRaining: false })}
              className={`rounded-2xl border p-5 text-left transition-all ${
                !settings.isRaining
                  ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                  : "bg-riderDark/30 border-riderBlue/10 text-gray-500"
              }`}
            >
              <div className="font-bold mb-2">Sunny</div>
              <div className="text-sm">6am-9am: 100 • 9am-5pm: 50 • 6pm-10pm: 100</div>
            </button>

            <button
              type="button"
              onClick={() => setSettings({ isRaining: true })}
              className={`rounded-2xl border p-5 text-left transition-all ${
                settings.isRaining
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-riderDark/30 border-riderBlue/10 text-gray-500"
              }`}
            >
              <div className="font-bold mb-2">Rainy</div>
              <div className="text-sm">6am-9am: 120 • 9am-5pm: 70 • 6pm-10pm: 120</div>
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-riderBlue hover:bg-blue-600 text-riderLight px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <FaSave /> {loading ? "Saving..." : "Save Weather Setting"}
          </button>
        </div>
      </form>
    </div>
  );
}
