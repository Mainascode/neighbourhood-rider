import connectDB from "../../../../lib/db.js";
import User from "../../../../models/User.js";
import { comparePassword, serializeUser, setSessionCookie } from "../../../../lib/auth.js";
import { fail, ok } from "../../../../lib/response.js";

export async function POST(request) {
  const body = await request.json();
  const normalizedEmail = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  await connectDB();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return fail("Invalid credentials.", 401);
  }

  const matches = await comparePassword(password, user.password);
  if (!matches) {
    return fail("Invalid credentials.", 401);
  }

  if (normalizedEmail === String(process.env.ADMIN_EMAIL || "").toLowerCase() && user.role !== "admin") {
    user.role = "admin";
    await user.save();
  }

  await setSessionCookie(user);
  return ok({ user: serializeUser(user), message: "Logged in." });
}
