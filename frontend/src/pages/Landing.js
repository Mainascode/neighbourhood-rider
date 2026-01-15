import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import HowItWorks from "../components/HowItWorks";
import Community from "../components/Community";
import CTASection from "../components/CTASection";
import Footer from "../components/Footer";
import ChatBot from "../components/Chatbot";
import "../index.css";


import { useAuth } from "../context/AuthContext";

export default function Landing() {
  const { user } = useAuth();

  const showContent = !user || user.role === "user";

  return (
    <>
      <Navbar />
      {showContent && <Hero />}
      <HowItWorks />
      <Community />
      {showContent && <CTASection />}
      <ChatBot />
      <Footer />
    </>
  );
}
