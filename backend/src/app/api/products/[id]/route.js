import connectDB from "../../../../lib/db.js";
import Product from "../../../../models/Product.js";
import { requireApiAdmin } from "../../../../lib/api-auth.js";
import { fail, ok } from "../../../../lib/response.js";

export async function PATCH(request, { params }) {
  const admin = await requireApiAdmin();
  if (!admin) {
    return fail("Unauthorized.", 401);
  }

  const body = await request.json();
  await connectDB();
  const update = { ...body };
  if (body.slug) {
    update.slug = String(body.slug).trim().toLowerCase();
  } else {
    delete update.slug;
  }
  await Product.findByIdAndUpdate(params.id, update);
  return ok({ message: "Product updated." });
}

export async function DELETE(_request, { params }) {
  const admin = await requireApiAdmin();
  if (!admin) {
    return fail("Unauthorized.", 401);
  }

  await connectDB();
  await Product.findByIdAndDelete(params.id);
  return ok({ message: "Product deleted." });
}
