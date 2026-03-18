import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import connectDB from "./db.js";
import User from "../models/User.js";

const SESSION_COOKIE = "nr_session";
const sessionSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "dev-secret";

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signSession(user) {
  return jwt.sign(
    {
      id: user._id?.toString() || user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    sessionSecret,
    { expiresIn: "7d" },
  );
}

export function verifySession(token) {
  return jwt.verify(token, sessionSecret);
}

export async function setSessionCookie(user) {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = verifySession(token);
    await connectDB();
    const user = await User.findById(payload.id).lean();
    return user ? serializeUser(user) : null;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth");
  }
  return user;
}

export async function requireAdminUser() {
  const user = await requireUser();
  if (user.role !== "admin") {
    redirect("/shop");
  }
  return user;
}

export function serializeUser(user) {
  return {
    id: user._id?.toString() || user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    location: user.location,
    referralCode: user.referralCode,
    freeDeliveryCredits: user.freeDeliveryCredits || 0,
    referralRewardGranted: Boolean(user.referralRewardGranted),
  };
}
