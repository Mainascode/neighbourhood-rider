import cors from "cors";
import { getAllowedOrigins } from "../lib/origins.js";

export default cors({
  origin: getAllowedOrigins(),
  credentials: true,
});
