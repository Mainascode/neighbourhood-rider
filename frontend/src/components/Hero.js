import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Hero() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleFirstOrder = () => {
    navigate(user ? "/order" : "/login");
  };

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
          <div className="inline-block bg-gradient-to-r from-riderMaroon to-orange-500 text-white px-8 py-4 rounded-2xl text-xl md:text-3xl font-black tracking-[0.2em] uppercase mb-7 border-2 border-white/70 mx-auto lg:mx-0 shadow-2xl shadow-riderMaroon/50 ring-4 ring-orange-200/70">
            🔔 NEIGHBOURHOOD RIDER
          </div>
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border-2 border-white/50 inline-block mb-10 shadow-xl shadow-riderBlue/5 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-riderBlue/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-riderMaroon/10"></div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-4 text-riderLight">
              Food na Supermarket <span className="text-riderMaroon">Delivered Fast</span> <br className="hidden md:block" />
              in Ruaka.
            </h1>
            <p className="text-gray-900 font-medium text-lg leading-relaxed max-w-lg">
              Order groceries, snacks, drinks, and quick meals around <strong>Gathigi Estate</strong>.
              One trusted admin handles stocking, fulfillment, delivery, and payment updates.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center opacity-0 animate-[fadeIn_1s_ease-out_1.2s_forwards]">
            <button onClick={handleFirstOrder} className="bg-riderMaroon hover:bg-rose-600 text-white font-bold py-4 px-10 rounded-full text-lg shadow-xl shadow-riderMaroon/20 transition-all hover:-translate-y-1 hover:shadow-2xl flex items-center gap-3">
              Make Your First Order <span className="text-xl">🛒</span>
            </button>
            <button onClick={() => navigate("/orders")} className="bg-riderBlue/10 hover:bg-riderBlue/20 text-riderLight font-bold py-4 px-8 rounded-full text-lg border border-riderBlue/20 backdrop-blur-md transition-all hover:border-riderBlue/50">
              Track My Delivery
            </button>
          </div>
        </motion.div>

        <motion.div
          className="w-full relative"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute -inset-4 bg-riderGreen/20 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-8 backdrop-blur-xl shadow-2xl">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Fresh groceries", emoji: "🥬" },
                { label: "Cooked meals", emoji: "🍛" },
                { label: "Snacks & drinks", emoji: "🥤" },
                { label: "Same-area delivery", emoji: "🏍️" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/80 p-5 text-center shadow-md">
                  <div className="text-3xl mb-2">{item.emoji}</div>
                  <p className="font-bold text-riderLight">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-riderMaroon/10 border border-riderMaroon/20 px-5 py-4 text-sm text-gray-800">
              Delivery area: <strong>Ruaka, Gathigi Estate only</strong>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
