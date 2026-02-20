import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import { signAccess, signRefresh } from "../../lib/jwt.js";
import { ok, fail } from "../../lib/response.js";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).toLowerCase());
}

export default async function register(req, res) {
  const googleOnly = String(process.env.GOOGLE_AUTH_ONLY || "false").toLowerCase() === "true";
  if (googleOnly) {
    return fail(res, "Password registration is disabled. Please continue with Google.", 403);
  }

  const { name, email, password, confirmPassword, acceptPrivacyPolicy, acceptTerms } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!name || !normalizedEmail || !password)
    return fail(res, "All fields required", 400);

  if (!isValidEmail(normalizedEmail))
    return fail(res, "Please use a valid email address", 400);

  if (!acceptPrivacyPolicy || !acceptTerms)
    return fail(res, "You must accept Privacy Policy and Terms to continue", 400);

  if (password !== confirmPassword)
    return fail(res, "Passwords do not match", 400);

  const exists = await User.findOne({ email: normalizedEmail });
  if (exists)
    return fail(res, "Email already registered", 409);

  const hashed = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email: normalizedEmail,
    password: hashed,
    role: "user",
    authProvider: "email",
    privacyPolicyAcceptedAt: new Date(),
    termsAcceptedAt: new Date(),
  });

  const accessToken = signAccess({
    id: user._id,
    role: user.role,
    email: user.email,
    name: user.name,
  });
  const refreshToken = signRefresh({
    id: user._id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  user.refreshTokens.push({
    token: refreshToken,
    device: req.headers["user-agent"] || "unknown",
  });

  await user.save();

  /* ✅ SET COOKIES CORRECTLY FOR PRODUCTION */
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

  return ok(res, {
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  }, 201);
}
