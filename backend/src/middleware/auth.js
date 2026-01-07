import { verifyAccess } from "../lib/jwt.js";

export default function auth(req, res, next) {
  try {
    const token = req.cookies.accessToken;
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const decoded = verifyAccess(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Session expired" });
  }
}
