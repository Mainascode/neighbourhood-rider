// src/lib/config.js

const REMOTE_API_URL = "https://neighbourhood-rider.onrender.com";

// Always target backend API explicitly. Avoid same-origin fallback on Vercel,
// which causes requests to hit frontend hosting instead of the Render backend.
export const API_URL = process.env.REACT_APP_API_URL || REMOTE_API_URL;
