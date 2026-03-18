import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import HowItWorks from "../components/HowItWorks";
import Community from "../components/Community";
import CTASection from "../components/CTASection";
import Footer from "../components/Footer";

import "../index.css";


import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { apiGetCached } from "../lib/api";

export default function Landing() {
  const { user } = useAuth();
  const [serverHour, setServerHour] = useState(null);

  useEffect(() => {
    const fetchServerTime = async () => {
      try {
        const data = await apiGetCached("/api/system/time", { ttlMs: 15000 });
        if (typeof data.hour === "number") setServerHour(data.hour);
      } catch (e) {
        // Ignore time fetch failure; fallback to no banner
      }
    };
    fetchServerTime();
  }, []);

  const showContent = !user || user.role === "user";

  return (
    <>
      <Navbar />
      {serverHour !== null && serverHour >= 21 && (
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 rounded-xl px-4 py-3 text-sm font-semibold">
            Late order in progress
            <div className="text-xs mt-1">Delivery continues as normal</div>
          </div>
        </div>
      )}
      {showContent && <Hero />}
      <HowItWorks />
      <Community />
      {showContent && <CTASection />}

      <Footer />
    </>
  );
}
