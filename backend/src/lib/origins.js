export function getAllowedOrigins() {
  const productionOrigins = [
    "https://neighbourhood-rider.vercel.app",
    process.env.CLIENT_URL,
  ].filter(Boolean);

  if (process.env.NODE_ENV === "production") {
    return [...new Set(productionOrigins)];
  }

  return [
    ...new Set([
      ...productionOrigins,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ]),
  ];
}
