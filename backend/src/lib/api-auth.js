import { cookies } from "next/headers";
import connectDB from "./db.js";
import User from "../models/User.js";
import { serializeUser, verifySession } from "./auth.js";

export async function getUserFromRequest() {
  const store = await cookies();
  const token = store.get("nr_session")?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = verifySession(token);
    await connectDB();
    const user = await User.findById(payload.id);
    return user ? serializeUser(user) : null;
  } catch {
    return null;
  }
}

export async function requireApiUser() {
  const user = await getUserFromRequest();
  return user;
}

export async function requireApiAdmin() {
  const user = await getUserFromRequest();
  return user?.role === "admin" ? user : null;
}
