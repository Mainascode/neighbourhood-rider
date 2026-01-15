import { FaCheckCircle } from "react-icons/fa";

export default function Community() {
  const benefits = [
    "Support your Local Businesses 🏪",
    "Trusted riders verified by community 🚴",
    "Lightning fast response times ⚡",
    "Secure pay on delivery 🤝",
  ];

  return (
    <section id="community" className="bg-transparent text-riderLight py-16 relative overflow-hidden">
      {/* Decor Circles */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-riderBlue opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-riderBlack opacity-5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center relative z-10">
        <div>
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl relative overflow-hidden">
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-riderMaroon/5 rounded-full blur-2xl pointer-events-none"></div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight text-riderLight relative z-10">
              Built for Your <br /> Neighbourood.
            </h2>
            <p className="text-xl text-gray-500 leading-relaxed font-bold relative z-10">
              We connect local shops to local people. From your favorite Mama Mboga
              to the Boda guy you trust. It’s an ecosystem that grows together.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-10 shadow-xl border border-gray-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-riderBlue/5 rounded-full blur-3xl -mr-32 -mt-32 transition-all group-hover:bg-riderBlue/10"></div>
          <h3 className="text-2xl font-bold mb-8 text-riderLight relative z-10">Why choose us?</h3>
          <div className="space-y-6 relative z-10">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-4 group/item">
                <FaCheckCircle className="text-riderBlue text-2xl flex-shrink-0 group-hover/item:scale-110 transition-transform" />
                <span className="text-lg font-bold text-gray-600">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
