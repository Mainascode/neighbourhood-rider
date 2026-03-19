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
    <section className="relative overflow-hidden bg-riderBlack text-riderLight py-12 md:py-24">
      <div
        className="absolute inset-0 z-0 opacity-[0.22]"
        style={{
          backgroundImage: "radial-gradient(rgba(122, 45, 58, 0.45) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      ></div>
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(122,45,58,0.18),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(15,23,42,0.9))]"></div>
      <div className="absolute -top-24 left-1/2 z-0 h-72 w-72 -translate-x-1/2 rounded-full bg-white/10 blur-3xl"></div>
      <div className="absolute bottom-0 right-0 z-0 h-80 w-80 rounded-full bg-riderBlue/10 blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[1fr_1.2fr] gap-8 items-center relative z-10">
        <motion.div
          className="flex flex-col justify-center text-center lg:text-left"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-3 mx-auto lg:mx-0 mb-7 rounded-full border border-white/15 bg-white/8 px-5 py-2.5 backdrop-blur-xl shadow-lg">
            <span className="flex h-2.5 w-2.5 rounded-full bg-riderMaroon shadow-[0_0_18px_rgba(122,45,58,0.9)]"></span>
            <span className="text-xs md:text-sm font-black tracking-[0.35em] uppercase text-white/85">
              Neighbourhood Rider
            </span>
          </div>
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/45 inline-block mb-10 shadow-xl shadow-riderBlue/5 relative overflow-hidden group hover:scale-[1.01] transition-transform duration-500">
            <div className="absolute top-0 right-0 h-32 w-32 bg-riderBlue/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-riderMaroon/10"></div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-4 text-riderLight">
              Everyday essentials,
              <span className="block text-riderMaroon">delivered smoothly.</span>
            </h1>
            <p className="text-gray-900 font-medium text-lg leading-relaxed max-w-xl">
              Browse groceries, meals, drinks, and household picks in one place, check out quickly, and follow every order update from payment to delivery.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center lg:justify-start">
              {["Groceries", "Fresh meals", "Snacks", "Drinks", "Quick delivery"].map((label) => (
                <span key={label} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-riderLight shadow-sm">
                  {label}
                </span>
              ))}
            </div>
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
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60 font-bold">What We Deliver</p>
                <h2 className="text-2xl font-extrabold mt-2 text-white">Simple ordering, clear updates</h2>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-right">
                <div className="text-xs text-white/60 uppercase tracking-[0.2em]">Flow</div>
                <div className="font-bold text-white">Shop → Pay → Track</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Fresh groceries", emoji: "🥬" },
                { label: "Cooked meals", emoji: "🍛" },
                { label: "Snacks & drinks", emoji: "🥤" },
                { label: "Live order updates", emoji: "🔔" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/80 p-5 text-center shadow-md border border-white/60">
                  <div className="text-3xl mb-2">{item.emoji}</div>
                  <p className="font-bold text-riderLight">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-white/10 border border-white/10 px-5 py-4 text-sm text-white/85">
              Fast checkout, payment confirmation, status updates, receipts, and delivery tracking all stay in one smooth flow.
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
