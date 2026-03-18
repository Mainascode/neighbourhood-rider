"use client";

import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const CartContext = createContext(null);

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        setValue(JSON.parse(raw));
      }
    } catch {}
  }, [key]);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue];
}

export function Providers({ children, initialUser = null }) {
  const [user, setUser] = useState(initialUser);
  const [cart, setCart] = usePersistentState("nr_cart", []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <CartContext.Provider value={{ cart, setCart }}>{children}</CartContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useCart() {
  return useContext(CartContext);
}
