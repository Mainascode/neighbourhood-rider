import ImageSlider from "./ImageSlider";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-transparent text-riderLight py-12 md:py-20">
      {/* Background Decor - light */}
      <div className="absolute top-0 right-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-riderMaroon to-transparent pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[1fr_1.2fr] gap-8 items-center relative z-10">

        {/* TEXT - Left Side */}
        <motion.div
          className="flex flex-col justify-center text-center lg:text-left"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="inline-block bg-gradient-to-r from-riderMaroon/10 to-riderBlue/10 text-riderMaroon px-6 py-2 rounded-full text-xs font-black tracking-widest uppercase mb-6 border-2 border-riderMaroon/10 mx-auto lg:mx-0 shadow-sm">
            🔔 Your Doorbell Service
          </div>
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border-2 border-white/50 inline-block mb-10 shadow-xl shadow-riderBlue/5 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-riderBlue/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-riderMaroon/10"></div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-4 text-riderLight">
              Cyclist wako wa <span className="text-riderMaroon">Mtaa</span> <br className="hidden md:block" />
              Ako Hapa.
            </h1>
            <p className="text-gray-900 font-medium text-lg leading-relaxed max-w-lg">
              Groceries, parcels, ama errands ndogo ndogo?
              Tuko ready kukusaidia chap chap. We are just around the corner.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
            <Link to="/order" className="bg-gradient-to-r from-riderMaroon to-riderOrange text-white px-10 py-4 rounded-full font-black text-lg shadow-xl shadow-riderMaroon/30 hover:shadow-2xl hover:shadow-riderMaroon/40 hover:-translate-y-1 transition-all duration-300 text-center active:scale-95">
              🚀 Order Now
            </Link>
            <Link to="/join" className="bg-white border-2 border-riderBlue text-riderBlue px-10 py-4 rounded-full font-bold text-lg hover:bg-riderBlue hover:text-white transition-all duration-300 text-center shadow-lg hover:shadow-riderBlue/30 hover:-translate-y-1 active:scale-95">
              🚲 Kuwa Cyclist
            </Link>
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
