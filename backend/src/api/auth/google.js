import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import { signAccess, signRefresh } from "../../lib/jwt.js";
import { ok, fail } from "../../lib/response.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function isGoogleOnlyMode() {
  return String(process.env.GOOGLE_AUTH_ONLY || "false").toLowerCase() === "true";
}

export default async function googleAuth(req, res) {
  try {
    const { credential, acceptPrivacyPolicy, acceptTerms } = req.body || {};
    if (!credential) return fail(res, "Google credential is required", 400);
    if (!acceptPrivacyPolicy || !acceptTerms) {
      return fail(res, "You must accept Privacy Policy and Terms to continue", 400);
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload?.email_verified) {
      return fail(res, "Only verified Google accounts are allowed", 401);
    }

    const email = String(payload.email).toLowerCase();
    let user = await User.findOne({ email });

    if (!user) {
      const hashedPlaceholder = await bcrypt.hash(`google:${email}:${Date.now()}`, 12);
      user = await User.create({
        name: payload.name || "Google User",
        email,
        password: hashedPlaceholder,
        role: "user",
        authProvider: "google",
        privacyPolicyAcceptedAt: new Date(),
        termsAcceptedAt: new Date(),
      });
    } else {
      user.name = user.name || payload.name || "Google User";
      user.authProvider = "google";
      if (!user.privacyPolicyAcceptedAt) user.privacyPolicyAcceptedAt = new Date();
      if (!user.termsAcceptedAt) user.termsAcceptedAt = new Date();
      if (email === process.env.ADMIN_EMAIL && user.role !== "admin") user.role = "admin";
      await user.save();
    }

    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = signAccess(tokenPayload);
    const refreshToken = signRefresh(tokenPayload);

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
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      googleOnly: isGoogleOnlyMode(),
    });
  } catch (err) {
    console.error("Google auth error:", err.message);
    return fail(res, "Google authentication failed", 401);
  }
}
