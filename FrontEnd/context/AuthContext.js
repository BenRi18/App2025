// frontend/context/AuthContext.js
import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedRole = await AsyncStorage.getItem("role");
        if (storedToken) {
          setToken(storedToken);
          setRole(storedRole);
        }
      } catch (e) {
        console.warn("Failed to restore auth", e);
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = async (newToken, newRole) => {
    try {
      await AsyncStorage.setItem("token", newToken);
      await AsyncStorage.setItem("role", newRole);
    } catch (e) {
      console.warn("Failed to persist auth", e);
    }
    setToken(newToken);
    setRole(newRole);
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("role");
    } catch (e) {
      console.warn("Failed to clear auth", e);
    }
    setToken(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
