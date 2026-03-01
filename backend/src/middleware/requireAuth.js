import { verifyAccess } from "../lib/jwt.js";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { getFirebaseAuth } from "../lib/firebaseAdmin.js";

async function resolveFirebaseUser(decodedFirebaseToken) {
  const email = String(decodedFirebaseToken?.email || "").trim().toLowerCase();
  if (!email) return null;

  let user = await User.findOne({ email });
  if (!user) {
    const placeholderPassword = await bcrypt.hash(`firebase:${email}:${Date.now()}`, 10);
    const provider = decodedFirebaseToken?.firebase?.sign_in_provider === "google.com" ? "google" : "email";
    user = await User.create({
      name: decodedFirebaseToken?.name || email,
      email,
      password: placeholderPassword,
      role: "user",
      authProvider: provider,
      privacyPolicyAcceptedAt: null,
      termsAcceptedAt: null,
    });
  }

  if (email === String(process.env.ADMIN_EMAIL || "").trim().toLowerCase() && user.role !== "admin") {
    user.role = "admin";
    await user.save();
  }

  return user;
}

export default async function requireAuth(req, res, next) {
  try {
    // Prefer explicit bearer token from frontend (Firebase ID token),
    // then fallback to legacy cookie token.
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ error: "No access token" });
    }

    // First try legacy JWT tokens.
    try {
      const decoded = verifyAccess(token);
      req.user = {
        ...decoded,
        _id: decoded._id || decoded.id,
      };
      return next();
    } catch {
      // Fallback to Firebase ID token.
    }

    const firebaseAuth = getFirebaseAuth();
    const decodedFirebaseToken = await firebaseAuth.verifyIdToken(token);
    const user = await resolveFirebaseUser(decodedFirebaseToken);
    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      firebaseUid: decodedFirebaseToken.uid,
    };
    return next();
  } catch (err) {
    console.error("Auth Error:", err.message);
    if (String(err?.message || "").includes("Firebase Admin env not configured")) {
      return res.status(500).json({ error: "Firebase Admin is not configured on the backend" });
    }
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
