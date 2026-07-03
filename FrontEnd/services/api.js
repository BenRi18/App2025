// FrontEnd/services/api.js
// Central API client — adds auth headers automatically and silently refreshes
// expired access tokens.
//
// ⚠️  Change API_URL to match your machine:
//   iOS Simulator  → http://localhost:3000
//   Android Emu    → http://10.0.2.2:3000
//   Physical device → http://<your-local-ip>:3000

import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_URL = "http://localhost:3000";

// ─── Build request headers ────────────────────────────────────────────────────
async function buildHeaders(isFormData = false) {
  const token = await AsyncStorage.getItem("token");
  return {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Silently refresh the access token ───────────────────────────────────────
async function doRefresh() {
  const refreshToken = await AsyncStorage.getItem("refreshToken");
  if (!refreshToken) throw new Error("NO_REFRESH_TOKEN");

  const res  = await fetch(`${API_URL}/auth/refresh`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error("REFRESH_FAILED");

  const data = await res.json();
  await AsyncStorage.multiSet([
    ["token",        data.token],
    ["refreshToken", data.refreshToken],
  ]);
  return data.token;
}

// ─── Core request ─────────────────────────────────────────────────────────────
async function request(endpoint, options = {}, isRetry = false) {
  const isFormData = options.body instanceof FormData;
  const headers    = await buildHeaders(isFormData);

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });

  // Auto-refresh once on 401
  if (res.status === 401 && !isRetry) {
    try {
      await doRefresh();
      return request(endpoint, options, true);
    } catch {
      await AsyncStorage.multiRemove(["token", "refreshToken", "role"]);
      const err = new Error("SESSION_EXPIRED");
      err.sessionExpired = true;
      throw err;
    }
  }

  return res;
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────
export const api = {
  get:    (path)       => request(path, { method: "GET" }),
  post:   (path, body) => request(path, {
    method: "POST",
    body:   body instanceof FormData ? body : JSON.stringify(body),
  }),
  put:    (path, body) => request(path, { method: "PUT",    body: JSON.stringify(body) }),
  patch:  (path, body) => request(path, { method: "PATCH",  body: JSON.stringify(body) }),
  delete: (path)       => request(path, { method: "DELETE" }),
};

// ─── JSON shorthand — throws on non-2xx ───────────────────────────────────────
export async function apiFetch(path, options = {}) {
  const res  = await request(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
