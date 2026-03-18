import connectDB from "../../../lib/db.js";
import Product from "../../../models/Product.js";
import { ensureDefaultProducts } from "../../../lib/bootstrap.js";
import { requireApiAdmin } from "../../../lib/api-auth.js";
import { fail, ok } from "../../../lib/response.js";

export async function GET() {
  await connectDB();
  await ensureDefaultProducts();
  const products = await Product.find({ isActive: true }).sort({ featured: -1, createdAt: -1 }).lean();
  return ok({
    products: products.map((product) => ({
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      category: product.category,
      description: product.description,
      price: product.price,
      unit: product.unit,
      image: product.image,
      featured: product.featured,
    })),
  });
}

export async function POST(request) {
  const admin = await requireApiAdmin();
  if (!admin) {
    return fail("Unauthorized.", 401);
  }

  const body = await request.json();
  await connectDB();

  if (!body.name || !body.slug || typeof body.price !== "number") {
    return fail("Name, slug, and price are required.");
  }

  const product = await Product.create({
    ...body,
    slug: String(body.slug || "").trim().toLowerCase(),
  });

  return ok({ message: "Product created.", productId: product._id.toString() }, { status: 201 });
}
