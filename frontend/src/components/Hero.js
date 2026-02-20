import ImageSlider from "./ImageSlider";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function Hero() {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden bg-riderBlack text-riderLight py-12 md:py-20">
      {/* Background Decor - Dot Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.4]" style={{
        backgroundImage: `radial-gradient(#F97316 1px, transparent 1px)`,
        backgroundSize: '24px 24px'
      }}></div>

      {/* Soft Gradient Overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-white/50 to-riderBlack"></div>

      {/* Decorative Blob */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-riderBlue/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[1fr_1.2fr] gap-8 items-center relative z-10">

        {/* TEXT - Left Side */}
        <motion.div
          className="flex flex-col justify-center text-center lg:text-left"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="inline-block bg-gradient-to-r from-riderMaroon/10 to-riderBlue/10 text-riderMaroon px-6 py-2 rounded-full text-xs font-black tracking-widest uppercase mb-6 border-2 border-riderMaroon/10 mx-auto lg:mx-0 shadow-sm">
            🔔 Nitume Doorbell Service
          </div>
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border-2 border-white/50 inline-block mb-10 shadow-xl shadow-riderBlue/5 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-riderBlue/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-riderMaroon/10"></div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-4 text-riderLight">
              Soko na Rider wa <span className="text-riderMaroon">Mtaa</span> <br className="hidden md:block" />
              Wako Hapa.
            </h1>
            <p className="text-gray-900 font-medium text-lg leading-relaxed max-w-lg">
              Tunaconnect mtaa mzima—kutoka kwa <strong>Mama Mboga</strong> mpaka mlangoni kwako na <strong>Rider wa kuaminika</strong>.
              Chochote unahitaji, sisi tuko ready.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center opacity-0 animate-[fadeIn_1s_ease-out_1.2s_forwards]">
            <button onClick={() => navigate("/order")} className="bg-riderMaroon hover:bg-rose-600 text-white font-bold py-4 px-10 rounded-full text-lg shadow-xl shadow-riderMaroon/20 transition-all hover:-translate-y-1 hover:shadow-2xl flex items-center gap-3">
              Order Now <span className="text-xl">🍕</span>
            </button>
            <div className="flex gap-4">
              <button onClick={() => navigate("/join")} className="bg-riderBlue/10 hover:bg-riderBlue/20 text-riderLight font-bold py-4 px-8 rounded-full text-lg border border-riderBlue/20 backdrop-blur-md transition-all hover:border-riderBlue/50">
                Join as Rider 🚴
              </button>
              <button onClick={() => navigate("/join-vendor")} className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 font-bold py-4 px-8 rounded-full text-lg border border-orange-500/20 backdrop-blur-md transition-all hover:border-orange-500/50">
                Sell with Us 🏪
              </button>
            </div>
          </div>
        </motion.div>

        {/* SLIDER - Right Side (Wider) */}
        <motion.div
          className="w-full relative"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute -inset-4 bg-riderGreen/20 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
          <ImageSlider />
        </motion.div>
      </div>
    </section>
  );
}
