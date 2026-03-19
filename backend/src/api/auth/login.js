import User from "../../models/User.js";
import bcrypt from "bcryptjs";
import { signAccess, signRefresh } from "../../lib/jwt.js";
import { ok, fail } from "../../lib/response.js";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).toLowerCase());
}

export default async function login(req, res) {
  const { email, password } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    return fail(res, "Please use a valid email address", 400);
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return fail(res, "Invalid credentials", 401);
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return fail(res, "Invalid credentials", 401);
  }

  // ✅ Auto-promote to admin if email matches env
  if (normalizedEmail === process.env.ADMIN_EMAIL && user.role !== "admin") {
    user.role = "admin";
  }

  await user.save();

  const payload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role, // 🔥 REQUIRED for admin
    name: user.name,
  };

  // ✅ SIGN TOKENS
  const accessToken = signAccess(payload);
  const refreshToken = signRefresh(payload);

  // ✅ SET COOKIES
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  // ✅ SEND USER BACK
  return ok(res, {
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
  });
}
