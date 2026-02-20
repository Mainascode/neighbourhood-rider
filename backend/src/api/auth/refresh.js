import { verifyRefresh, signAccess } from "../../lib/jwt.js";
import { ok, fail } from "../../lib/response.js";

export default function refresh(req, res) {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return fail(res, "No refresh token", 401);

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

    return ok(res, { refreshed: true });
  } catch {
    return fail(res, "Invalid refresh token", 401);
  }
}
