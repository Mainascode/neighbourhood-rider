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
    if (isSupabaseConfigured) {
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
    }

    const loadUser = async () => {
      const hasToken = !!localStorage.getItem("token");
      try {
        const meData = await apiFetch("/api/auth/me");
        setUser(meData.user || null);
        if (meData.user && !socket.connected) socket.connect();
      } catch {
        if (!hasToken) {
          setUser(null);
          return;
        }
        try {
          await apiFetch("/api/auth/refresh", { method: "POST" });
          const meData = await apiFetch("/api/auth/me");
          setUser(meData.user || null);
          if (meData.user && !socket.connected) socket.connect();
        } catch {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();

    // 🔄 Silent Refresh Loop (Every 14 minutes)
    const refreshInterval = setInterval(async () => {
      if (!localStorage.getItem("token")) return;
      try {
        await apiFetch("/api/auth/refresh", { method: "POST" });
      } catch (err) {
        console.error("Auto-refresh failed", err);
      }
    }, 14 * 60 * 1000); // 14 mins

    return () => clearInterval(refreshInterval);
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

    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, acceptPrivacyPolicy }),
    });

    setUser(data.user);
    if (data.user && !socket.connected) socket.connect();
  };

  const loginWithGoogle = async (credential, acceptPrivacyPolicy, acceptTerms) => {
    const data = await apiFetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential, acceptPrivacyPolicy, acceptTerms }),
    });

    setUser(data.user);
    if (data.user && !socket.connected) socket.connect();
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

    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        confirmPassword,
        acceptPrivacyPolicy,
        acceptTerms,
      }),
    });

    setUser(data.user);
    if (data.user && !socket.connected) socket.connect();
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

    await apiFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    if (socket.connected) socket.disconnect();
  };

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin, login, register, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
