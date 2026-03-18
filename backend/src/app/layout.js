import "./globals.css";
import Navbar from "../components/navbar.js";
import Footer from "../components/footer.js";
import { Providers } from "./providers.js";
import { getCurrentUser } from "../lib/auth.js";

export const metadata = {
  title: "Neighbourhood Rider",
  description: "Single-admin neighborhood delivery app for Ruaka, Gachie, and Gathiga.",
  manifest: "/manifest.webmanifest",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="bg-slate-950 text-white">
        <Providers initialUser={user}>
          <Navbar />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
