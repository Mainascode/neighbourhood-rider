import jwt from "jsonwebtoken";

const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

export const signAccess = (payload) =>
  jwt.sign(payload, accessSecret, { expiresIn: "15m" });

export const signRefresh = (payload) =>
  jwt.sign(payload, refreshSecret, { expiresIn: "30d" });

export const verifyAccess = (token) =>
  jwt.verify(token, accessSecret);

export const verifyRefresh = (token) =>
  jwt.verify(token, refreshSecret);
