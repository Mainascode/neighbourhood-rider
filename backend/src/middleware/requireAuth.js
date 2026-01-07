import { verifyAccess } from "../lib/jwt.js";

export default function requireAuth(req, res, next) {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({ error: "No access token" });
    }

    const decoded = verifyAccess(token);

    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    console.error("Auth Error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
