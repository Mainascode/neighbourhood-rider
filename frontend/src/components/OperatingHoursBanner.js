import React, { useState, useEffect } from 'react';

const OperatingHoursBanner = () => {
    const [isClosed, setIsClosed] = useState(false);
    

    useEffect(() => {
        const checkTime = () => {
            const now = new Date();
            const hour = now.getHours(); // 0-23
            // closed if < 6 or >= 21
            if (hour < 6 || hour >= 21) {
                setIsClosed(true);
            } else {
                setIsClosed(false);
            }
        };

        checkTime();
        const interval = setInterval(checkTime, 60000); // check every minute
        return () => clearInterval(interval);
    }, []);

    if (!isClosed) return null;

    return (
        <div className="fixed top-20 left-0 right-0 z-50 px-4 animate-in slide-in-from-top-4">
            <div className="max-w-4xl mx-auto bg-red-600/90 text-white backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10">
                <div className="flex items-center gap-3">
                    <span className="text-2xl bg-white/20 p-2 rounded-lg">🌙</span>
                    <div>
                        <h3 className="font-bold text-lg">We are currently closed.</h3>
                        <p className="text-red-100 text-sm font-medium">Platform hours: 06:00 AM - 09:00 PM. Service resumes at 6:00 AM.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OperatingHoursBanner;
