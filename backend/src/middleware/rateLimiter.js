const store = new Map();

function cleanupExpiredEntries(now) {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) store.delete(key);
  }
}

export function createRateLimiter({
  windowMs,
  max,
  keyGenerator = (req) => req.ip || req.headers["x-forwarded-for"] || "anonymous",
  message = "Too many requests, please try again later.",
}) {
  if (!windowMs || !max) {
    throw new Error("createRateLimiter requires windowMs and max.");
  }

  return (req, res, next) => {
    const now = Date.now();
    cleanupExpiredEntries(now);

    const key = `${req.path}:${keyGenerator(req)}`;
    const bucket = store.get(key);

    if (!bucket || bucket.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({ error: message });
    }

    bucket.count += 1;
    store.set(key, bucket);
    return next();
  };
}
