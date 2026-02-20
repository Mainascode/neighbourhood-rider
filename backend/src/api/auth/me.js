import { verifyAccess } from "../../lib/jwt.js";
import User from "../../models/User.js";
import { ok, fail } from "../../lib/response.js";

export default async function me(req, res) {
  const token = req.cookies.accessToken;

  if (!token) {
    return fail(res, "No access token", 401);
  }

  try {
    const decoded = verifyAccess(token);
    const userId = decoded._id || decoded.id;
    const user = await User.findById(userId).select("_id name email role");
    if (!user) return fail(res, "User not found", 404);
    return ok(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch {
    return fail(res, "Invalid token", 401);
  }
}
