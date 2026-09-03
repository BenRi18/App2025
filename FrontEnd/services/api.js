// FrontEnd/services/api.js
// Central API client — adds auth headers automatically and silently refreshes
// expired access tokens.
// The URL comes from config.js (auto-detected LAN IP, or MANUAL_API_URL).

import { getSecure, setSecure, clearSecure } from "./secureStore";
import { API_URL } from "../config";

export { API_URL };

// ─── Build request headers ────────────────────────────────────────────────────
async function buildHeaders(isFormData = false) {
  const token = await getSecure("token");
  return {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Silently refresh the access token ───────────────────────────────────────
async function doRefresh() {
  const refreshToken = await getSecure("refreshToken");
  if (!refreshToken) throw new Error("NO_REFRESH_TOKEN");

  const res  = await fetch(`${API_URL}/auth/refresh`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error("REFRESH_FAILED");

  const data = await res.json();
  await Promise.all([
    setSecure("token",        data.token),
    setSecure("refreshToken", data.refreshToken),
  ]);
  return data.token;
}

// ─── Core request ─────────────────────────────────────────────────────────────
// Requests hang forever by default. A cold-starting server or a dropped
// connection would leave spinners spinning with no way out, so every request
// gets a deadline.
const TIMEOUT_MS = 20000;

async function request(endpoint, options = {}, isRetry = false) {
  const isFormData = options.body instanceof FormData;
  const headers    = await buildHeaders(isFormData);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout ?? TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
      signal:  controller.signal,
    });
  } catch (err) {
    // Normalize transport failures so callers can tell them apart from a
    // server that answered with an error status.
    const e = new Error(
      err.name === "AbortError"
        ? "The server took too long to respond."
        : "Can't reach the server. Check your connection."
    );
    e.isNetworkError = true;
    e.isTimeout      = err.name === "AbortError";
    throw e;
  } finally {
    clearTimeout(timer);
  }

  // Auto-refresh once on 401
  if (res.status === 401 && !isRetry) {
    try {
      await doRefresh();
      return request(endpoint, options, true);
    } catch {
      await clearSecure();
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
  // DELETE can carry a body — account deletion sends the password confirmation
  delete: (path, body) => request(path, {
    method: "DELETE",
    ...(body !== undefined && { body: JSON.stringify(body) }),
  }),
};

// ─── JSON shorthand — throws on non-2xx ───────────────────────────────────────
export async function apiFetch(path, options = {}) {
  const res  = await request(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
