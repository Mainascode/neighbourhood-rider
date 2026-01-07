import { FaCheckCircle } from "react-icons/fa";

export default function Community() {
  const benefits = [
    "Trusted riders verified by community",
    "Lightning fast response times",
    "Secure pay on delivery",
    "Community-first approach"
  ];

  return (
    <section id="community" className="bg-transparent text-riderLight py-16 relative overflow-hidden">
      {/* Decor Circles */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-riderBlue opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-riderBlack opacity-5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center relative z-10">
        <div>
          <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-riderBlue/10 shadow-lg">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight text-riderLight">
              Built for Your <br /> Neighbourood.
            </h2>
            <p className="text-xl text-gray-900 leading-relaxed font-bold opacity-90">
              We work with riders who know your streets, your shops, and your community.
              This is not a faceless delivery service it’s local, personal, and safe.
            </p>
          </div>
        </div>

        <div className="bg-riderDark/50 backdrop-blur-md rounded-3xl p-10 shadow-2xl border border-riderBlue/10">
          <h3 className="text-2xl font-bold mb-8 text-riderLight">Why choose us?</h3>
          <div className="space-y-6">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <FaCheckCircle className="text-riderBlue text-2xl flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-lg font-semibold text-gray-200">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
