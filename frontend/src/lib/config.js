// src/lib/config.js

const REMOTE_API_URL = "https://neighbourhood-rider.onrender.com";
const isVercelHosted =
  typeof window !== "undefined" && /\.vercel\.app$/i.test(window.location.hostname);

export const API_URL = process.env.REACT_APP_API_URL || (isVercelHosted ? "" : REMOTE_API_URL);
