import { verifyRefresh, signAccess } from "../../lib/jwt.js";

export default function refresh(req, res) {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.sendStatus(401);

    const user = verifyRefresh(token);

    const newAccess = signAccess({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("accessToken", newAccess, {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      maxAge: 15 * 60 * 1000,
    });

    res.json({ ok: true });
  } catch {
    return res.sendStatus(401);
  }
}
