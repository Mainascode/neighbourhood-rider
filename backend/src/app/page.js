import connectDB from "../lib/db.js";
import Product from "../models/Product.js";
import { ensureDefaultProducts, ensureSystemSettings } from "../lib/bootstrap.js";
import { calculateDeliveryFee } from "../lib/delivery.js";
import { getCurrentUser } from "../lib/auth.js";
import LandingPage from "../components/landing-page.js";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await connectDB();
  await ensureDefaultProducts();
  const settings = await ensureSystemSettings();
  const products = await Product.find({ isActive: true }).sort({ featured: -1, createdAt: -1 }).limit(6).lean();
  const user = await getCurrentUser();
  const delivery = calculateDeliveryFee({ weather: settings.weather });

  return (
    <LandingPage
      products={products}
      user={user}
      weather={settings.weather}
      deliveryPreview={delivery.fee}
    />
  );
}
