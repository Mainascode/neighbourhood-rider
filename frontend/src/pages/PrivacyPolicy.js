import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10 text-gray-800">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="mb-4">
          Nitume Doorbell Service collects only the data needed to operate deliveries, payments, and support.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-2">Data We Collect</h2>
        <p className="mb-4">
          Account details, order details, location points for deliveries, and transaction metadata.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-2">How We Use Data</h2>
        <p className="mb-4">
          We use data to fulfill orders, improve service reliability, prevent fraud, and provide customer support.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-2">Data Protection</h2>
        <p className="mb-4">
          Access is restricted by role, sensitive data is protected in transit, and production secrets are kept out of source control.
        </p>
        <h2 className="text-xl font-semibold mt-6 mb-2">Kenya Data Protection</h2>
        <p className="mb-4">
          We operate with awareness of Kenya Data Protection Act obligations for lawful and secure handling of personal data.
        </p>
      </main>
      <Footer />
    </div>
  );
}
