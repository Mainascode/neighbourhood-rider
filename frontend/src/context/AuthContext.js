import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase";
import { socket } from "../lib/socket";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const googleProvider = new GoogleAuthProvider();

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
          return connectSocketWithFirebaseToken(firebaseUser);
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
    await connectSocketWithFirebaseToken(creds.user);
  };

  /* ───── register ───── */
  const register = async (email, password, name = "") => {
    const creds = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(creds.user, { displayName: name });
    }
    const mappedUser = await mapFirebaseUser(creds.user);
    setUser(mappedUser);
    await connectSocketWithFirebaseToken(creds.user);
  };

  const loginWithGoogle = async () => {
    const creds = await signInWithPopup(auth, googleProvider);
    const mappedUser = await mapFirebaseUser(creds.user);
    setUser(mappedUser);
    await connectSocketWithFirebaseToken(creds.user);
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
      value={{ user, loading, isAdmin, login, register, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
  const connectSocketWithFirebaseToken = async (firebaseUser) => {
    if (!firebaseUser) {
      if (socket.connected) socket.disconnect();
      return;
    }

    const token = await firebaseUser.getIdToken();
    socket.auth = { token };
    if (!socket.connected) socket.connect();
  };
