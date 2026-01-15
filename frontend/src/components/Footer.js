export default function Footer() {
  return (
    <footer className="bg-white text-gray-400 py-8 text-center border-t border-gray-100 font-bold text-sm">
      © {new Date().getFullYear()} Neighborhood Rider. Built for the community.
    </footer>
  );
}
