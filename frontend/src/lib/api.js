import { API_URL } from "./config";
import { auth } from "../firebase";

const cache = new Map();

export async function apiFetch(path, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 15000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(options.headers || {});
    if (!headers.has("Authorization")) {
      const token = await auth.currentUser?.getIdToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      ...options,
      headers,
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const message =
        (isJson && (data.error || data.message || data?.data?.message)) ||
        "Request failed. Please try again.";
      throw new Error(message);
    }
    if (isJson && typeof data === "object" && data !== null && "success" in data && "data" in data) {
      return data.data;
    }
    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiGetCached(path, options = {}) {
  const ttlMs = options.ttlMs ?? 10000;
  const key = path;
  const now = Date.now();
  const existing = cache.get(key);

  if (existing && existing.data && existing.expiresAt > now) {
    return existing.data;
  }

  if (existing && existing.promise) {
    return existing.promise;
  }

  const promise = apiFetch(path, { method: "GET", ...options })
    .then((data) => {
      cache.set(key, { data, expiresAt: Date.now() + ttlMs });
      return data;
    })
    .finally(() => {
      const state = cache.get(key);
      if (state?.promise) {
        cache.set(key, { data: state.data, expiresAt: state.expiresAt || 0 });
      }
    });

  cache.set(key, { promise });
  return promise;
}

export function invalidateCache(path) {
  cache.delete(path);
}
