import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { socket } from "../lib/socket";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ───── restore session on refresh ───── */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const meData = await apiFetch("/api/auth/me");
        setUser(meData.user || null);
        if (meData.user && !socket.connected) socket.connect();
      } catch {
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
