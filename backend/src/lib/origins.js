function splitOriginList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getAllowedOrigins() {
  const configuredOrigins = [
    ...splitOriginList(process.env.CLIENT_URL),
    ...splitOriginList(process.env.CORS_ALLOWED_ORIGINS),
  ];

  const productionOrigins = [
    "https://neighbourhood-rider.vercel.app",
    "https://www.neighbourhood-rider.vercel.app",
    ...configuredOrigins,
  ];

  const developmentOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
  ];

  if (String(process.env.NODE_ENV).toLowerCase() === "production") {
    return [...new Set(productionOrigins)];
  }

  return [...new Set([...productionOrigins, ...developmentOrigins])];
}

export function isAllowedOrigin(origin) {
  if (!origin) return true;

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}
