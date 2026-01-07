import User from "../../models/User.js";
import bcrypt from "bcryptjs";
import { signAccess, signRefresh } from "../../lib/jwt.js";

export default async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // ✅ Auto-promote to admin if email matches env
  if (email === process.env.ADMIN_EMAIL && user.role !== "admin") {
    user.role = "admin";
    await user.save();
  }

  // ✅ Auto-set Rider to ONLINE
  if (user.role === "rider") {
    const Rider = (await import("../../models/Rider.js")).default;
    await Rider.findOneAndUpdate(
      { userId: user._id },
      { isAvailable: true, status: "approved" }, // Ensure approved for testing simplicity
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const payload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role, // 🔥 REQUIRED for admin
  };

  // ✅ SIGN TOKENS
  const accessToken = signAccess(payload);
  const refreshToken = signRefresh(payload);

  // ✅ SET COOKIES
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // localhost ONLY
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  // ✅ SEND USER BACK
  res.json({
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
  });
}
