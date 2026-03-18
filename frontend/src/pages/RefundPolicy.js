import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10 text-gray-800">
        <h1 className="text-3xl font-bold mb-6">Refund Policy</h1>
        <p className="mb-4">
          Nitume Doorbell Service handles refunds based on order status and payment confirmation records.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-2">Eligible Refund Scenarios</h2>
        <p className="mb-4">
          Failed fulfillment, duplicate payment, or cancelled paid orders where delivery was not completed.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-2">Non-Refundable Scenarios</h2>
        <p className="mb-4">
          Completed deliveries with confirmed receipt, or customer error outside platform policy.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-2">Processing Window</h2>
        <p className="mb-4">
          Approved refunds are initiated after verification and processed to the original payment channel.
        </p>
      </main>
      <Footer />
    </div>
  );
}
