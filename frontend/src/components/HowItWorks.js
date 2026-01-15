import { FaRegComments, FaBicycle, FaWallet } from "react-icons/fa";

export default function HowItWorks() {
  const steps = [
    {
      icon: <FaRegComments className="text-4xl text-riderMaroon mb-4" />,
      title: "Tuambie Unataka Nini",
      desc: "Chat na assistant wetu hapo chini ama kwa WhatsApp utuambie unahitaji nini.",
    },
    {
      icon: <FaBicycle className="text-4xl text-riderMaroon mb-4" />,
      title: "Cyclist Atakuja Chap Chap",
      desc: "Cyclist wetu wa mtaa atachukua order yako na kukuletea mbio.",
    },
    {
      icon: <FaWallet className="text-4xl text-riderBlack mb-4" />,
      title: "Lipa Akifika",
      desc: "Ukipata mzigo wako salama, lipa na M-Pesa. Hakuna stress.",
    },
  ];

  return (
    <section id="how" className="bg-transparent py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-extrabold text-riderLight mb-4">
            Simple. <span className="text-riderMaroon">Fast.</span> Reliable.
          </h2>
          <p className="text-gray-800 font-medium max-w-2xl mx-auto text-lg">
            Getting your errands done shouldn't be a hassle.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div
              key={i}
              className="bg-white p-8 rounded-3xl border border-gray-100 flex flex-col items-center text-center group hover:-translate-y-2 hover:shadow-xl transition-all duration-300 shadow-sm"
            >
              <div className="p-4 bg-riderMaroon/5 rounded-full mb-6 group-hover:bg-riderMaroon/10 transition-colors">
                {step.icon}
              </div>
              <h3 className="font-bold text-xl text-riderLight mb-3">{step.title}</h3>
              <p className="text-gray-500 font-medium text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
