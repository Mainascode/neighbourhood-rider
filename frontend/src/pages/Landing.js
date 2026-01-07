import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import HowItWorks from "../components/HowItWorks";
import Community from "../components/Community";
import CTASection from "../components/CTASection";
import Footer from "../components/Footer";
import ChatBot from "../components/Chatbot";
import "../index.css";


export default function Landing() {
  return (
    <>
      <Navbar />
      <Hero />
      <HowItWorks />
      <Community />
      <CTASection />
      <ChatBot />
      <Footer />
    </>
  );
}
