import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10 text-gray-800">
        <h1 className="text-3xl font-bold mb-6">Terms and Conditions</h1>
        <p className="mb-4">
          Welcome to Nitume Doorbell Service. By using Neighborhood Rider, you agree to these terms.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-2">Service Scope</h2>
        <p className="mb-4">
          We provide neighborhood delivery coordination between customers, riders, and vendors.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-2">User Responsibilities</h2>
        <p className="mb-4">
          Users must provide accurate order details, lawful delivery items, and valid contact information.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-2">Payments</h2>
        <p className="mb-4">
          All delivery and product charges are shown at checkout. Payment disputes are handled through support.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-2">Account Use</h2>
        <p className="mb-4">
          We may suspend accounts for fraud, abuse, policy violations, or unsafe conduct.
        </p>
      </main>
      <Footer />
    </div>
  );
}
