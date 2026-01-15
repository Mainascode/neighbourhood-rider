import { Link } from "react-router-dom";

export default function CTASection() {
  return (
    <section className="bg-transparent text-riderLight py-16 border-t border-riderBlue/10">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl inline-block mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-riderBlue/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-riderLight relative z-10">
            Uko ready kuorder?
          </h2>
          <p className="text-gray-500 font-bold text-lg max-w-2xl mx-auto relative z-10">
            Chochote unahitaji, cyclist wetu ako area ready kukusaidia.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <Link to="/order" className="bg-riderMaroon px-8 py-4 rounded-xl font-bold text-lg text-riderLight shadow-lg hover:bg-rose-800 transition-all hover:-translate-y-1 text-center">
            Order Now
          </Link>
          <Link to="/join" className="bg-riderDark/50 backdrop-blur-md border border-riderBlue/10 text-riderLight px-8 py-4 rounded-xl font-bold text-lg hover:bg-riderDark/70 hover:shadow-md transition-all text-center">
            Kuwa Cyclist
          </Link>
        </div>
      </div>
    </section>
  );
}
