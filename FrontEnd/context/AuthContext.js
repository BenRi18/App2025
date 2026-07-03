// FrontEnd/context/AuthContext.js
import React, { createContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform }       from "react-native";
import { API_URL }        from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

export const AuthContext = createContext();

// ─── Push token helper ────────────────────────────────────────────────────────
async function registerPushToken(accessToken) {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const expoPushToken = tokenData.data;

    await fetch(`${API_URL}/auth/push-token`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        Authorization:   `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ expoPushToken }),
    });

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name:       "Default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }
  } catch (err) {
    // Non-fatal — push is best-effort
    console.warn("Push token registration failed:", err.message);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export default function AuthProvider({ children }) {
  const [token,        setToken]        = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [role,         setRole]         = useState(null);
  const [user,         setUser]         = useState(null);   // cached /auth/me response
  const [loading,      setLoading]      = useState(true);

  // ── Restore session on app start ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [t, rt, r] = await AsyncStorage.multiGet(["token", "refreshToken", "role"]);
        const tok  = t[1];
        const rt_  = rt[1];
        const role_= r[1];
        if (tok) {
          setToken(tok);
          setRefreshToken(rt_);
          setRole(role_);
          connectSocket(tok);
        }
      } catch (e) {
        console.warn("Failed to restore session:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (newToken, newRefreshToken, newRole) => {
    try {
      await AsyncStorage.multiSet([
        ["token",        newToken],
        ["refreshToken", newRefreshToken],
        ["role",         newRole],
      ]);
    } catch (e) {
      console.warn("Failed to persist session:", e);
    }

    setToken(newToken);
    setRefreshToken(newRefreshToken);
    setRole(newRole);

    // Connect socket + register push token (both non-fatal)
    connectSocket(newToken);
    registerPushToken(newToken);
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    // Tell server to invalidate the refresh token
    if (refreshToken) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ refreshToken }),
        });
      } catch {}
    }

    try {
      await AsyncStorage.multiRemove(["token", "refreshToken", "role"]);
    } catch (e) {
      console.warn("Failed to clear session:", e);
    }

    disconnectSocket();
    setToken(null);
    setRefreshToken(null);
    setRole(null);
    setUser(null);
  }, [refreshToken]);

  return (
    <AuthContext.Provider value={{
      token, refreshToken, role, user, loading,
      login, logout,
      setUser,  // lets screens cache the fetched profile
    }}>
      {children}
    </AuthContext.Provider>
  );
}
