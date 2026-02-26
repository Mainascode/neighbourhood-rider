import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { socket } from "../lib/socket";
import { isSupabaseConfigured, supabase } from "../supabaseClient";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const exchangeSupabaseSession = async (session) => {
    const token = session?.access_token;
    if (!token) return null;

    const data = await apiFetch("/api/auth/supabase/exchange", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return data.user || null;
  };

  /* ───── restore session on refresh ───── */
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setLoading(false);
      if (socket.connected) socket.disconnect();
      return () => {};
    }

    const loadSupabaseSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const backendUser = await exchangeSupabaseSession(data.session);
        setUser(backendUser);
        if (backendUser && !socket.connected) socket.connect();
        if (!backendUser && socket.connected) socket.disconnect();
      } catch {
        setUser(null);
        if (socket.connected) socket.disconnect();
      } finally {
        setLoading(false);
      }
    };

    loadSupabaseSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      exchangeSupabaseSession(session)
        .then((backendUser) => {
          setUser(backendUser);
          if (backendUser && !socket.connected) socket.connect();
          if (!backendUser && socket.connected) socket.disconnect();
        })
        .catch(() => {
          setUser(null);
          if (socket.connected) socket.disconnect();
        });
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ───── login ───── */
  const login = async (email, password, acceptPrivacyPolicy) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      const backendUser = await exchangeSupabaseSession(data.session);
      setUser(backendUser);
      if (backendUser && !socket.connected) socket.connect();
      return;
    }

    throw new Error("Supabase auth is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.");
  };

  /* ───── register ───── */
  const register = async (name, email, password, confirmPassword, acceptPrivacyPolicy, acceptTerms) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: "user",
            acceptPrivacyPolicy,
            acceptTerms,
          },
        },
      });

      if (error) throw new Error(error.message);

      const backendUser = await exchangeSupabaseSession(data.session);
      setUser(backendUser);
      if (backendUser && !socket.connected) socket.connect();

      return {
        emailConfirmationRequired: !data.session,
      };
    }

    throw new Error("Supabase auth is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.");
  };

  /* ───── logout ───── */
  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
      try {
        await apiFetch("/api/auth/logout", { method: "POST" });
      } catch {
        // Ignore backend logout failures if Supabase session has already ended.
      }
      setUser(null);
      if (socket.connected) socket.disconnect();
      return;
    }

    setUser(null);
    if (socket.connected) socket.disconnect();
  };

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
