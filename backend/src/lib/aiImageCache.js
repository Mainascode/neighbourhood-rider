import crypto from "crypto";

export function normalizeProductName(productName) {
  const raw = String(productName || "").toLowerCase().trim();
  if (!raw) return "";

  // Remove special characters except spaces/hyphens, then normalize whitespace to single hyphen.
  return raw
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function hashPrompt(prompt) {
  return crypto.createHash("sha256").update(String(prompt || "")).digest("hex");
}
