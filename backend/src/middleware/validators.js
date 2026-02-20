export function validateLoginPayload(req, res, next) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "invalid credentials payload" });
  }
  return next();
}

export function validateRegisterPayload(req, res, next) {
  const { name, email, password, confirmPassword } = req.body || {};
  if (!name || !email || !password || !confirmPassword) {
    return res.status(400).json({ error: "name, email, password, and confirmPassword are required" });
  }
  if ([name, email, password, confirmPassword].some((v) => typeof v !== "string")) {
    return res.status(400).json({ error: "invalid registration payload" });
  }
  return next();
}

export function validateStkPushPayload(req, res, next) {
  const { phoneNumber, amount, orderId } = req.body || {};
  if (!phoneNumber || !amount || !orderId) {
    return res.status(400).json({ error: "phoneNumber, amount, and orderId are required" });
  }

  const phoneString = String(phoneNumber).trim();
  const amountNum = Number(amount);
  const orderIdString = String(orderId).trim();

  if (!/^254\d{9}$/.test(phoneString)) {
    return res.status(400).json({ error: "phoneNumber must be in 2547XXXXXXXX format" });
  }
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }
  if (orderIdString.length < 8) {
    return res.status(400).json({ error: "orderId is invalid" });
  }

  return next();
}
