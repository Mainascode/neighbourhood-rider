import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = String(process.env.REACT_APP_SUPABASE_URL || "").trim();
const supabaseAnonKey = String(process.env.REACT_APP_SUPABASE_ANON_KEY || "").trim();

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const hasValidSupabaseUrl = isValidHttpUrl(rawSupabaseUrl);
export const isSupabaseConfigured = Boolean(hasValidSupabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  const reason = !rawSupabaseUrl
    ? "missing REACT_APP_SUPABASE_URL"
    : !hasValidSupabaseUrl
      ? "invalid REACT_APP_SUPABASE_URL (must start with http:// or https://)"
      : "missing REACT_APP_SUPABASE_ANON_KEY";
  console.warn(`Supabase disabled: ${reason}.`);
}

export const supabase = isSupabaseConfigured
  ? (() => {
      try {
        return createClient(rawSupabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Supabase disabled: failed to initialize client.", error);
        return null;
      }
    })()
  : null;
