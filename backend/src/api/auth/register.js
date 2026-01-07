import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import { signAccess, signRefresh } from "../../lib/jwt.js";


export default async function register(req, res) {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields required" });

  if (password !== confirmPassword)
    return res.status(400).json({ message: "Passwords do not match" });

  const exists = await User.findOne({ email });
  if (exists)
    return res.status(409).json({ message: "Email already registered" });

  const hashed = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    password: hashed,
    role: email === "kimaningugihenry@gmail.com" ? "admin" : "user",
  });

  const accessToken = signAccess({ id: user._id, role: user.role });
  const refreshToken = signRefresh({ id: user._id, role: user.role });

  user.refreshTokens.push({
    token: refreshToken,
    device: req.headers["user-agent"] || "unknown",
  });

  await user.save();

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

  res.status(201).json({
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}
