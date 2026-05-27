// BackEnd/utils/pushNotifications.js
import { Expo } from "expo-server-sdk";

const expo = new Expo();

/**
 * Send an Expo push notification to a single device.
 * Silently no-ops if the token is missing or invalid — never throws.
 *
 * @param {string|null|undefined} pushToken  Expo push token from the device
 * @param {string}  title
 * @param {string}  body
 * @param {object}  [data={}]   Extra payload forwarded to the app
 */
export async function sendPush(pushToken, title, body, data = {}) {
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) return;

  try {
    const chunks = expo.chunkPushNotifications([
      { to: pushToken, sound: "default", title, body, data },
    ]);
    for (const chunk of chunks) {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      for (const receipt of receipts) {
        if (receipt.status === "error") {
          console.warn("Push notification error:", receipt.message);
        }
      }
    }
  } catch (err) {
    // Non-fatal — log and continue
    console.error("sendPush failed:", err.message);
  }
}

/**
 * Send the same notification to multiple tokens at once.
 */
export async function sendPushToMany(pushTokens, title, body, data = {}) {
  const valid = (pushTokens || []).filter(t => t && Expo.isExpoPushToken(t));
  if (valid.length === 0) return;

  try {
    const messages = valid.map(to => ({ to, sound: "default", title, body, data }));
    const chunks   = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (err) {
    console.error("sendPushToMany failed:", err.message);
  }
}
