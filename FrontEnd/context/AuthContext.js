// FrontEnd/context/AuthContext.js
import React, { createContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform }       from "react-native";
import { api, API_URL }   from "../services/api";
import { DEV_FORCE_LOGIN } from "../config";
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
        // Dev-only: force the login screen every boot while testing
        if (__DEV__ && DEV_FORCE_LOGIN) {
          await AsyncStorage.multiRemove(["token", "refreshToken", "role"]);
          return;
        }

        const [t, rt, r] = await AsyncStorage.multiGet(["token", "refreshToken", "role"]);
        const tok  = t[1];
        const rt_  = rt[1];
        const role_= r[1];
        if (tok) {
          // Validate the stored session before trusting it. api.get
          // auto-refreshes an expired access token; if refresh fails it
          // clears storage and throws.
          try {
            const res = await api.get("/auth/me");
            if (res.ok) {
              setToken(await AsyncStorage.getItem("token")); // may have been refreshed
              setRefreshToken(await AsyncStorage.getItem("refreshToken"));
              setRole(role_);
              connectSocket(tok);
            } else if (res.status === 404 || res.status === 403) {
              // Account no longer exists on this server (e.g. different DB)
              await AsyncStorage.multiRemove(["token", "refreshToken", "role"]);
            } else {
              // Server-side error — keep the session, don't punish the user
              setToken(tok); setRefreshToken(rt_); setRole(role_);
              connectSocket(tok);
            }
          } catch (err) {
            if (err.sessionExpired) {
              // Refresh failed — storage already cleared by api.js
            } else {
              // Network unreachable — keep the session optimistically
              setToken(tok); setRefreshToken(rt_); setRole(role_);
              connectSocket(tok);
            }
          }
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
