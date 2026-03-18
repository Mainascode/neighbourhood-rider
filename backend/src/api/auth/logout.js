import { ok } from "../../lib/response.js";

// backend/src/api/auth/logout.js
export default function logout(req, res) {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  return ok(res, { loggedOut: true });
}
