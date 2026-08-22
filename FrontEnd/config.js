// FrontEnd/config.js
// Single source of truth for the backend URL + development switches.
//
// In development, the dev machine's LAN IP is auto-detected from Expo's
// hostUri (the same address Metro serves the app from), so this works on
// any machine — desktop, laptop, physical phone — with zero editing.
//
// NOTE: auto-detection requires LAN mode (`npx expo start`). In tunnel mode
// hostUri is an exp.direct domain that can't reach your local API — set
// MANUAL_API_URL below instead.

import Constants from "expo-constants";

// Set this to force a specific backend, e.g. "http://192.168.1.50:3000"
// or your production URL. Leave null to auto-detect.
const MANUAL_API_URL = "https://jobswipe-api-5aly.onrender.com";

// TESTING CONVENIENCE: set true to always boot to the login screen (the saved
// session is cleared on launch). Only works in development builds — production
// users always keep their sessions. Set back to false for normal behavior.
export const DEV_FORCE_LOGIN = false;

const API_PORT = 3000;

function detectApiUrl() {
  if (MANUAL_API_URL) return MANUAL_API_URL;

  // hostUri looks like "192.168.1.23:8081" when served over LAN
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  const host = hostUri?.split(":")[0];

  if (host && /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return `http://${host}:${API_PORT}`;      // physical device on LAN
  }
  return `http://localhost:${API_PORT}`;      // simulator / web fallback
}

export const API_URL = detectApiUrl();
console.log("API_URL →", API_URL);
