import { useEffect, useState } from "react";
import { API_URL } from "../lib/config";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { FaQuestionCircle, FaChevronDown, FaChevronUp } from "react-icons/fa";

export default function Faqs() {
    const [faqs, setFaqs] = useState([]);
    const [openIndex, setOpenIndex] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFaqs();
    }, []);

    const fetchFaqs = async () => {
        try {
            const res = await fetch(`${API_URL}/api/faqs`);
            const data = await res.json();
            setFaqs(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleFaq = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };


    return (
        <div className="min-h-screen flex flex-col bg-transparent text-riderLight font-sans">
            <Navbar />

            <main className="flex-grow pt-24 pb-16 px-6">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-extrabold text-riderLight mb-4 flex justify-center items-center gap-3">
                            <FaQuestionCircle className="text-riderMaroon" /> Frequently Asked Questions
                        </h1>
                        <p className="text-lg text-gray-600">
                            Got questions? We have answers. If you can't find what you're looking for, chat with us!
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="w-8 h-8 border-4 border-riderMaroon border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="space-y-4 mb-16">
                            {faqs.length === 0 ? (
                                <div className="text-center py-10 bg-riderBlack/90 rounded-2xl shadow-sm border border-riderBlue/10">
                                    <p className="text-gray-600">No FAQs currently published.</p>
                                </div>
                            ) : (
                                faqs.map((faq, index) => (
                                    <div
                                        key={faq._id}
                                        className="bg-riderDark/90 rounded-2xl shadow-lg border border-riderBlue/10 overflow-hidden transition-all duration-300 hover:bg-riderBlack"
                                    >
                                        <button
                                            onClick={() => toggleFaq(index)}
                                            className="w-full flex justify-between items-center p-6 text-left focus:outline-none"
                                        >
                                            <h3 className={`text-lg font-bold transition-colors ${openIndex === index ? "text-riderBlue" : "text-riderLight"}`}>
                                                {faq.question}
                                            </h3>
                                            <span className={`text-gray-600 transition-transform duration-300 ${openIndex === index ? "rotate-180" : ""}`}>
                                                {openIndex === index ? <FaChevronUp /> : <FaChevronDown />}
                                            </span>
                                        </button>

                                        <div
                                            className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                                                }`}
                                        >
                                            <div className="p-6 pt-0 text-gray-700 leading-relaxed border-t border-riderBlue/10">
                                                {faq.answer}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
