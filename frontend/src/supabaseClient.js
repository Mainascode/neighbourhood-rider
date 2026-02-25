import { createClient } from "@supabase/supabase-js";

// Set these in hosting dashboards, never in source code:
// - Vercel: Project Settings -> Environment Variables
// - Render: Service -> Environment -> Environment Variables
// Then redeploy after saving values.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Keep app running with a clear warning for local/dev misconfiguration.
  // Auth calls will fail until env vars are set correctly.
  // eslint-disable-next-line no-console
  console.warn(
    "Missing Supabase env vars. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

