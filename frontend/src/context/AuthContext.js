import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ───── restore session on refresh ───── */
  useEffect(() => {
    const loadUser = async () => {
      try {
        let res = await fetch(`${API}/api/auth/me`, {
          credentials: "include",
        });

        if (res.status === 401) {
          try {
            const refreshRes = await fetch(`${API}/api/auth/refresh`, {
              method: "POST",
              credentials: "include",
            });
            if (refreshRes.ok) {
              res = await fetch(`${API}/api/auth/me`, {
                credentials: "include",
              });
            }
          } catch {
            // refresh failed, user stays null
          }
        }

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();

    // 🔄 Silent Refresh Loop (Every 14 minutes)
    const refreshInterval = setInterval(async () => {
      try {
        await fetch(`${API}/api/auth/refresh`, { method: "POST", credentials: "include" });
      } catch (err) {
        console.error("Auto-refresh failed", err);
        // Optional: logout() if refresh fails hard, but better to let the next request fail to avoid abrupt UX
      }
    }, 14 * 60 * 1000); // 14 mins

    return () => clearInterval(refreshInterval);
  }, []);

  /* ───── login ───── */
  const login = async (email, password) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Login failed");

    setUser(data.user);
  };

  /* ───── register ───── */
  const register = async (name, email, password, confirmPassword) => {
    const res = await fetch(`${API}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name,
        email,
        password,
        confirmPassword,
      }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Registration failed");

    setUser(data.user);
  };

  /* ───── logout ───── */
  const logout = async () => {
    await fetch(`${API}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
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
