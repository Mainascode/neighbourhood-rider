import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-white text-gray-500 py-8 text-center border-t border-gray-100 font-bold text-sm">
      <div className="mb-2">© {new Date().getFullYear()} Neighborhood Rider. Built for the community.</div>
      <div className="flex items-center justify-center gap-4 text-xs font-semibold">
        <Link to="/terms" className="hover:text-riderMaroon transition-colors">Terms</Link>
        <Link to="/privacy" className="hover:text-riderMaroon transition-colors">Privacy</Link>
        <Link to="/refund-policy" className="hover:text-riderMaroon transition-colors">Refunds</Link>
      </div>
    </footer>
  );
}
