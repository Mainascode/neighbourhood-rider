import cors from "cors";

export default cors({
  origin: process.env.CLIENT_URL || "https://neighbourhood-rider.vercel.app",
  credentials: true,
});
