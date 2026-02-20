import AdminAuditLog from "../models/AdminAuditLog.js";

const REDACT_KEYS = new Set([
  "password",
  "confirmPassword",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "secret",
  "passkey",
]);

function normalizeIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return (forwarded || req.ip || "").replace(/^::ffff:/, "");
}

function sanitizePayload(value) {
  if (Array.isArray(value)) return value.map(sanitizePayload);
  if (!value || typeof value !== "object") return value;

  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (REDACT_KEYS.has(key)) {
      out[key] = "[REDACTED]";
      continue;
    }
    out[key] = sanitizePayload(val);
  }
  return out;
}

export function auditAdminAction(action) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== "admin") return next();

    res.on("finish", async () => {
      if (req.method === "GET") return;
      if (res.statusCode >= 500) return;

      try {
        await AdminAuditLog.create({
          adminUserId: req.user._id || req.user.id,
          adminEmail: req.user.email,
          action,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          sourceIp: normalizeIp(req),
          userAgent: req.headers["user-agent"],
          payload: sanitizePayload(req.body || {}),
        });
      } catch (err) {
        console.error("Admin audit log write failed:", err.message);
      }
    });

    next();
  };
}
