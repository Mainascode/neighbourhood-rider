import React from "react";

export default function LiveBackground() {
    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#0a0a0e]">
            {/* 🖼️ Background Image Base - Fully Visible */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100"
                style={{ backgroundImage: "url('/background.png')" }}
            ></div>

            {/* 🟣 Darker Overlay for better contrast */}
            <div className="absolute inset-0 bg-[#050510]/80"></div>

            {/* 🔴 Moving Blob 1 */}
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-riderMaroon/20 rounded-full blur-[120px] animate-blob"></div>

            {/* 🔵 Moving Blob 2 */}
            <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] bg-riderBlue/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>

            {/* 🟡 Moving Blob 3 */}
            <div className="absolute bottom-[-10%] left-[20%] w-[45vw] h-[45vw] bg-purple-900/20 rounded-full blur-[120px] animate-blob animation-delay-4000"></div>

            {/* 🕸️ Optional geometric overlay for "Cyber" feel */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
        </div>
    );
}
