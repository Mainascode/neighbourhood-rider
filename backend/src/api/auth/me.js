import User from "../../models/User.js";
import { ok, fail } from "../../lib/response.js";

export default async function me(req, res) {
  const userId = req.user?._id || req.user?.id;
  if (!userId) return fail(res, "No access token", 401);

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
}
