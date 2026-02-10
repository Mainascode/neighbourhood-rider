import React, { useState, useEffect } from 'react';
import { API_URL } from "../lib/config";

const OperatingHoursBanner = () => {
    const [isLate, setIsLate] = useState(false);
    

    useEffect(() => {
        const fetchServerTime = async () => {
            try {
                const res = await fetch(`${API_URL}/api/system/time`);
                const data = await res.json();
                if (typeof data.hour === "number") {
                    setIsLate(data.hour >= 21);
                }
            } catch (e) { }
        };
        fetchServerTime();
        const interval = setInterval(fetchServerTime, 60000);
        return () => clearInterval(interval);
    }, []);

    if (!isLate) return null;

    return (
        <div className="fixed top-20 left-0 right-0 z-50 px-4 animate-in slide-in-from-top-4">
            <div className="max-w-4xl mx-auto bg-yellow-500/90 text-white backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10">
                <div className="flex items-center gap-3">
                    <span className="text-2xl bg-white/20 p-2 rounded-lg">🌙</span>
                    <div>
                        <h3 className="font-bold text-lg">Late order in progress</h3>
                        <p className="text-yellow-100 text-sm font-medium">Delivery continues as normal</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OperatingHoursBanner;
