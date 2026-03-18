import connectDB from "../../../lib/db.js";
import { requireApiAdmin } from "../../../lib/api-auth.js";
import { ensureSystemSettings } from "../../../lib/bootstrap.js";
import { fail, ok } from "../../../lib/response.js";

export async function GET() {
  await connectDB();
  const settings = await ensureSystemSettings();
  return ok({ weather: settings.weather, isRaining: settings.isRaining });
}

export async function PATCH(request) {
  const admin = await requireApiAdmin();
  if (!admin) {
    return fail("Unauthorized.", 401);
  }

  const body = await request.json();
  await connectDB();
  const settings = await ensureSystemSettings();
  settings.isRaining = body.isRaining === true || body.weather === "rainy";
  settings.weather = settings.isRaining ? "rainy" : "sunny";
  await settings.save();
  return ok({ message: "Weather updated.", weather: settings.weather, isRaining: settings.isRaining });
}
