// src/lib/config.js

const REMOTE_API_URL = "https://neighbourhood-rider.onrender.com";

// Always target backend API explicitly. Avoid same-origin fallback on Vercel,
// which causes requests to hit frontend hosting instead of the Render backend.
export const API_URL = process.env.REACT_APP_API_URL || REMOTE_API_URL;

function parseBooleanFlag(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

export const ENABLE_MAPS = parseBooleanFlag(
  process.env.REACT_APP_ENABLE_MAPS
    ?? process.env.NEXT_PUBLIC_ENABLE_MAPS
    ?? process.env.ENABLE_MAPS,
  false
);
