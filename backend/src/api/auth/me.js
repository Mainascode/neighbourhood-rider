import { verifyAccess } from "../../lib/jwt.js";

export default function me(req, res) {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ message: "No access token" });
  }

  try {
    const decoded = verifyAccess(token);
    res.json({ user: decoded });
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
