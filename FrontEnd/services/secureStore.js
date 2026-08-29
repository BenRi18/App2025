// FrontEnd/services/secureStore.js
//
// Secure credential storage — the single place auth tokens are read/written.
//
// WHY: AsyncStorage is UNENCRYPTED. On a rooted/jailbroken device, or via a
// device backup, anything stored there is readable in plaintext — including
// login tokens, which are as good as a password to an attacker. This is
// OWASP Mobile M1 (Improper Credential Usage) / M9 (Insecure Data Storage),
// the most common mobile security failure.
//
// expo-secure-store puts values in the iOS Keychain and Android Keystore,
// which are hardware-backed and encrypted at rest.
//
// Migration: on first run we move any tokens still sitting in AsyncStorage
// into secure storage and delete the plaintext copies, so existing users are
// protected without being logged out.
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = ["token", "refreshToken", "role"];

// SecureStore is unavailable on web; fall back so development still works.
const available = SecureStore.isAvailableAsync ? true : false;

export async function setSecure(key, value) {
  if (value == null) return removeSecure(key);
  try {
    if (available) return await SecureStore.setItemAsync(key, String(value));
  } catch {}
  return AsyncStorage.setItem(key, String(value));
}

export async function getSecure(key) {
  try {
    if (available) {
      const v = await SecureStore.getItemAsync(key);
      if (v != null) return v;
    }
  } catch {}
  return AsyncStorage.getItem(key);
}

export async function removeSecure(key) {
  try {
    if (available) await SecureStore.deleteItemAsync(key);
  } catch {}
  return AsyncStorage.removeItem(key);
}

export async function clearSecure() {
  await Promise.all(KEYS.map(removeSecure));
}

/**
 * Move any credentials left in plaintext AsyncStorage into secure storage.
 * Safe to call on every launch; does nothing once migrated.
 */
export async function migrateFromAsyncStorage() {
  if (!available) return;
  try {
    for (const key of KEYS) {
      const legacy = await AsyncStorage.getItem(key);
      if (legacy != null) {
        await SecureStore.setItemAsync(key, legacy);
        await AsyncStorage.removeItem(key);   // remove the plaintext copy
      }
    }
  } catch {
    // Migration is best-effort — never block app start
  }
}
