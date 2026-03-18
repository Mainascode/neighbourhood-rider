import { redirect } from "next/navigation";
import ShopPage from "../../components/shop-page.js";
import connectDB from "../../lib/db.js";
import { ensureDefaultProducts, ensureSystemSettings } from "../../lib/bootstrap.js";
import Product from "../../models/Product.js";
import { calculateDeliveryFee } from "../../lib/delivery.js";
import { getCurrentUser } from "../../lib/auth.js";

export const dynamic = "force-dynamic";

export default async function ShopScreen() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  await connectDB();
  await ensureDefaultProducts();
  const settings = await ensureSystemSettings();
  const products = await Product.find({ isActive: true }).sort({ featured: -1, createdAt: -1 }).lean();
  const delivery = calculateDeliveryFee({
    weather: settings.isRaining ? "rainy" : "sunny",
    freeDelivery: user.freeDeliveryCredits > 0,
  });

  return (
    <ShopPage
      initialProducts={products.map((product) => ({
        id: product._id.toString(),
        name: product.name,
        category: product.category,
        description: product.description,
        price: product.price,
        unit: product.unit,
      }))}
      initialWeather={settings.isRaining ? "rainy" : "sunny"}
      deliveryPreview={delivery.fee}
    />
  );
}
