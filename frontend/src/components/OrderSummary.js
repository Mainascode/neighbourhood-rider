export default function OrderSummary({ order, onConfirm }) {
  return (
    <div className="bg-neutral-900 border-t border-neutral-800 p-4">
      <h3 className="font-semibold text-cyan-400 mb-2">
        Order Summary
      </h3>

      <ul className="text-sm space-y-1">
        {order.map((item, i) => (
          <li key={i}>• {item}</li>
        ))}
      </ul>

      <button
        onClick={onConfirm}
        className="mt-3 w-full bg-green-500 hover:bg-green-600 text-black py-2 rounded-lg font-bold"
      >
        Find Nearby Rider 🚴‍♂️
      </button>
    </div>
  );
}
