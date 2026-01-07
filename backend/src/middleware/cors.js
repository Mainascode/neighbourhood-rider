import cors from "cors";

export default cors({
  origin: [
    "https://neighbourhood-rider.vercel.app",
    "http://localhost:3000",
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true,
});
