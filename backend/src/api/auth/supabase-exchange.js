import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import { signAccess, signRefresh } from "../../lib/jwt.js";
import { fail, ok } from "../../lib/response.js";
import { isSupabaseAuthConfigured, supabaseAdmin } from "../../lib/supabaseAdmin.js";

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

export default async function supabaseExchange(req, res) {
  if (!isSupabaseAuthConfigured) {
    return fail(res, "Supabase auth is not configured on the server", 503);
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return fail(res, "Missing Supabase access token", 401);
  }

  const {
    data: { user: sbUser },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !sbUser?.email) {
    return fail(res, "Invalid Supabase token", 401);
  }

  const email = String(sbUser.email).trim().toLowerCase();
  const supabaseId = sbUser.id;

  let user = await User.findOne({
    $or: [{ supabaseId }, { email }],
  });

  if (!user) {
    const placeholderPassword = await bcrypt.hash(`supabase:${email}:${Date.now()}`, 12);
    user = await User.create({
      name: sbUser.user_metadata?.name || email,
      email,
      password: placeholderPassword,
      role: "user",
      authProvider: "supabase",
      supabaseId,
      privacyPolicyAcceptedAt: new Date(),
      termsAcceptedAt: new Date(),
    });
  } else {
    user.email = email;
    user.name = user.name || sbUser.user_metadata?.name || email;
    user.authProvider = "supabase";
    if (!user.supabaseId) user.supabaseId = supabaseId;
  }

  if (email === String(process.env.ADMIN_EMAIL || "").trim().toLowerCase()) {
    user.role = "admin";
  }

  await user.save();

  const tokenPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const jwtAccessToken = signAccess(tokenPayload);
  const refreshToken = signRefresh(tokenPayload);
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("accessToken", jwtAccessToken, {
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
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
  });
}

