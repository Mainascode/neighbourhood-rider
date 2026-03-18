export default function RouteLoader() {
  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-6">
      <div className="bg-white border border-gray-100 rounded-2xl px-6 py-5 shadow-lg flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-riderBlue animate-pulse"></span>
        <span className="text-sm font-bold text-gray-600 tracking-wide">Loading experience...</span>
      </div>
    </div>
  );
}
