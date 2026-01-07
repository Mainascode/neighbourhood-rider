import { useState, useEffect, useRef } from "react";
import { FaComments, FaPaperPlane, FaTimes } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { API_URL } from "../lib/config";


// Replace with actual Admin WhatsApp

export default function ChatBot({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Sema boss! 👋 I’m your neighborhood assistant. Unataka nikuhelp aje leo?" },
  ]);
  const [input, setInput] = useState("");


  const [orderData, setOrderData] = useState({ items: "", location: "" });
  const [loading, setLoading] = useState(false);

  const endRef = useRef(null);

  /* Auto scroll */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const addMessage = (sender, text) => {
    setMessages((prev) => [...prev, { sender, text }]);
  };

  const processInput = async (text) => {
    const lower = text.toLowerCase();

    // Reset Flow
    if (lower === "cancel" || lower === "reset") {

      setOrderData({ items: "", location: "" });
      return "Order cancelled. How can I help you? (Type 'Order' to start again)";
    }

    /* API Call to Backend GPT */
    try {
      setLoading(true);
      console.log("ChatBot Requesting:", `${API_URL}/api/chat`);
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          context: { ...orderData, userName: user?.name }
        }),
      });
      const response = await res.json();
      setLoading(false);

      if (response.data) {
        setOrderData((prev) => ({ ...prev, ...response.data }));
      }

      if (response.data) {
        setOrderData((prev) => ({ ...prev, ...response.data }));
      }

      // 🛑 Require "Yes" Confirmation
      if (response.data?.confirmed) {
        // Double check if user actually typed "yes" or similar
        const isExplicitYes = /yes|ndio|sawa|confirm|okay|sure/i.test(input);

        if (!isExplicitYes) {
          return "Got it! Just type 'Yes' to confirm and I'll find a rider immediately. 🏍️";
        }

        setLoading(true);
        const finalOrder = { ...orderData, ...response.data };

        // 1. Send Order to Backend and get Assignment
        const result = await notifyBackend(finalOrder);

        setLoading(false);

        if (result && result.assignedRider) {
          return `Order Received! ✅\n\n🏍️ Rider Assigned: ${result.assignedRider.name}\n📞 Phone: ${result.assignedRider.phone}\n\nThey are coming to ${finalOrder.location}.`;
        } else {
          return "Order Received! ✅ seeking the nearest rider... You will be notified shortly.";
        }
      }

      return response.text; // The GPT reply

    } catch (err) {
      console.error(err);
      setLoading(false);
      return "Network error. Please try again.";
    }
  };

  const notifyBackend = async (data) => {
    try {
      const res = await fetch(`${API_URL}/api/orders/bot-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: data.items.split(","),
          location: data.location,
          email: user?.email || "mainaemmanuel855@gmail.com", // Fallback
        }),
      });
      return await res.json();
    } catch (err) {
      console.error("Backend sync failed", err);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userText = input;
    setInput("");
    addMessage("user", userText);

    // Bot Response (Simulate delay)
    setTimeout(async () => {
      const reply = await processInput(userText);
      if (reply) addMessage("bot", reply);
    }, 600);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-80 md:w-96 bg-riderBlack/95 border border-riderBlue/20 shadow-2xl rounded-2xl overflow-hidden mb-4 flex flex-col h-[500px]"
          >
            {/* Header */}
            <div className="bg-riderBlue p-4 flex justify-between items-center shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse border border-riderBlue/10"></div>
                <div>
                  <h3 className="font-bold text-riderLight text-sm">Rider Support</h3>
                  <p className="text-blue-200 text-xs">Online</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-riderLight/80 hover:text-riderLight transition-colors">
                <FaTimes />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${msg.sender === "user"
                      ? "bg-riderMaroon text-riderLight rounded-br-none"
                      : "bg-riderDark text-riderLight rounded-bl-none border border-riderBlue/20"
                      }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && <div className="text-xs text-gray-600 text-center animate-pulse">Loading...</div>}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-riderDark/50 border-t border-riderBlue/20 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type here..."
                className="flex-1 bg-gray-100 border-none text-gray-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-riderBlue/20"
              />
              <button
                onClick={sendMessage}
                className="bg-riderBlue hover:bg-blue-900 text-riderLight p-2.5 rounded-xl transition-colors shadow-md"
              >
                <FaPaperPlane />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-riderMaroon text-riderLight p-4 rounded-full shadow-lg flex items-center justify-center text-3xl hover:bg-rose-800 transition-colors"
      >
        {isOpen ? <FaTimes /> : <FaComments />}
      </motion.button>
    </div>
  );
}
