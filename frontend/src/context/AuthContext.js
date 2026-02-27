import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import { socket } from "../lib/socket";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const mapFirebaseUser = async (firebaseUser) => {
    if (!firebaseUser) return null;
    const tokenResult = await firebaseUser.getIdTokenResult();
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: firebaseUser.displayName || firebaseUser.email || "User",
      role: tokenResult?.claims?.role || "user",
    };
  };

  /* ───── session recovery via Firebase ───── */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      mapFirebaseUser(firebaseUser)
        .then((mappedUser) => {
          setUser(mappedUser);
          if (mappedUser && !socket.connected) socket.connect();
          if (!mappedUser && socket.connected) socket.disconnect();
        })
        .catch(() => {
          setUser(null);
          if (socket.connected) socket.disconnect();
        })
        .finally(() => {
          setLoading(false);
        });
    });

    return () => unsubscribe();
  }, []);

  /* ───── login ───── */
  const login = async (email, password) => {
    const creds = await signInWithEmailAndPassword(auth, email, password);
    const mappedUser = await mapFirebaseUser(creds.user);
    setUser(mappedUser);
    if (mappedUser && !socket.connected) socket.connect();
  };

  /* ───── register ───── */
  const register = async (email, password) => {
    const creds = await createUserWithEmailAndPassword(auth, email, password);
    const mappedUser = await mapFirebaseUser(creds.user);
    setUser(mappedUser);
    if (mappedUser && !socket.connected) socket.connect();
  };

  /* ───── logout ───── */
  const logout = async () => {
    await signOut(auth);
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
