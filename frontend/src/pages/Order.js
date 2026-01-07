import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import ChatBot from "../components/Chatbot";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { socket } from "../lib/socket";
import LiveMap from "../components/LiveMap";
import { API_URL } from "../lib/config";

export default function Order() {
    const { user } = useAuth();

    const [showFaq, setShowFaq] = useState(false);
    const [faqs, setFaqs] = useState([]);
    const [activeOrder, setActiveOrder] = useState(null);

    // Check for active order on mount
    useEffect(() => {
        const checkOrder = async () => {
            try {
                const res = await fetch(`${API_URL}/api/orders/my`, {
                    credentials: "include",
                    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
                });
                const data = await res.json();
                if (data && data.length > 0) {
                    // Find active order
                    const active = data.find(o => o.status === 'DELIVERING' || o.status === 'PENDING');
                    if (active) setActiveOrder(active);
                }
            } catch (e) { }
        };
        checkOrder();
    }, []);

    const handleOpenFaq = async () => {
        setShowFaq(true);
        if (faqs.length === 0) {
            try {
                const res = await fetch(`${API_URL}/api/faqs`);
                const data = await res.json();
                setFaqs(data);
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-transparent text-riderLight relative">
            <Navbar />

            <main className="flex-grow flex flex-col items-center justify-center p-6 text-center z-10">
                <div className="absolute top-24 right-6 md:right-10">
                    <button
                        onClick={handleOpenFaq}
                        className="bg-riderDark/50 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-riderBlue/20 text-sm font-bold text-riderLight hover:bg-riderDark/70 transition-all flex items-center gap-2"
                    >
                        <span>❓</span> Help & FAQs
                    </button>
                </div>

                <h1 className="text-4xl font-extrabold mb-4 text-riderLight">
                    Start Your Order
                </h1>
                <p className="text-lg text-gray-600 mb-8 max-w-lg">
                    Click the chat icon below to tell us what you need. Our cyclists are ready!
                </p>

                <div className="bg-riderBlack/90 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-riderBlue/10 max-w-md w-full">
                    <h3 className="font-bold text-xl mb-4 text-riderLight">Common Items</h3>
                    <ul className="text-left space-y-2 text-gray-700">
                        <li className="flex items-center gap-2">🍞 Bread</li>
                        <li className="flex items-center gap-2">🥛 Milk</li>
                        <li className="flex items-center gap-2">🥚 Eggs</li>
                        <li className="flex items-center gap-2">🍎 Fruits</li>
                        <li className="flex items-center gap-2">🥦 Vegetables</li>
                        <li className="flex items-center gap-2">🍗 Meat</li>
                        <li className="flex items-center gap-2">🧻 Household Supplies</li>
                        <li className="flex items-center gap-2">💊 Pharmacy Items</li>
                    </ul>
                </div>
            </main>

            {/* Live Map Section (Persistent) */}
            {/* Live Map Section (Persistent) - Only show if active order */}
            {activeOrder && (
                <div className="w-full max-w-4xl mx-auto px-6 mb-12 relative z-10">
                    <div className="bg-riderBlack/90 backdrop-blur-md rounded-3xl p-6 border border-riderBlue/10 shadow-xl">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-riderLight italic">
                            <span className="text-3xl">📍</span> Live Delivery Map
                        </h2>
                        <LiveMap role="user" socket={socket} order={activeOrder} />
                    </div>
                </div>
            )}

            <ChatBot user={user} />
            <Footer />

            {/* FAQ Modal */}
            {showFaq && (
                <div className="fixed inset-0 bg-riderBlack/90 z-[100] flex items-center justify-center p-4">
                    <div className="bg-riderBlack border border-riderBlue/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col text-riderLight">
                        <div className="p-6 border-b border-riderBlue/10 flex justify-between items-center bg-riderDark/50">
                            <h2 className="text-xl font-bold">Frequently Asked Questions</h2>
                            <button onClick={() => setShowFaq(false)} className="w-8 h-8 rounded-full bg-riderDark/50 hover:bg-riderDark/50 flex items-center justify-center font-bold text-riderLight">✕</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <h2 className="text-2xl font-bold mb-4 font-style-italic">Common Questions</h2>
                            {/* Accordion would go here */}
                            <div className="space-y-4">
                                {faqs.map(faq => (
                                    <div key={faq._id} className="bg-riderDark/50 p-4 rounded-xl border border-riderBlue/10 text-left hover:bg-riderDark/70 transition-colors">
                                        <h4 className="font-bold text-riderBlue mb-2">{faq.question}</h4>
                                        <p className="text-gray-700">{faq.answer}</p>
                                    </div>
                                ))}
                                {faqs.length === 0 && <p className="text-gray-500">Loading FAQs...</p>}
                            </div>

                            <div className="mt-8 pt-6 border-t border-riderBlue/10 text-center">
                                <p className="text-sm text-gray-500">Still need help? Chat with our support team!</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
