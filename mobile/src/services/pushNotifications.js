// ============================================
// PUSH NOTIFICATIONS SERVICE
// ============================================
// Handles:
// - Permission request (Android)
// - Getting an Expo Push Token
// - Sending it to the backend
// - Setting up Android notification channel
// - Listeners for incoming notifications + taps
//
// ⚠️ Push notifications DO NOT work in Expo Go on Android - only in real APK builds.

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";

import { registerPushTokenApi } from "../api/auth";


// Foreground notification handler - show banner + sound even when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,    // SDK 51+
    shouldShowList: true,      // SDK 51+
  }),
});


/**
 * Request notification permissions and register token with backend.
 * Returns the push token (or null on failure).
 */
export async function registerForPushNotifications() {
  // Must be a real device (not emulator)
  if (!Device.isDevice) {
    console.log("[push] Not a real device - skipping push registration");
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563eb",
    });
  }

  // Request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.log("[push] Permission denied");
    return null;
  }

  // Get the Expo push token
  let tokenData;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
      ?? Constants.easConfig?.projectId;
    tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  } catch (err) {
    console.log("[push] Failed to get token:", err.message);
    return null;
  }

  const token = tokenData?.data;
  if (!token) {
    console.log("[push] No token returned");
    return null;
  }

  console.log("[push] Got push token:", token);

  // Register with backend
  try {
    await registerPushTokenApi(token);
    console.log("[push] Token registered with backend");
  } catch (err) {
    console.log("[push] Failed to register with backend:", err.message);
  }

  return token;
}


/**
 * Clear the push token on the backend (e.g. on logout).
 */
export async function unregisterPushNotifications() {
  try {
    await registerPushTokenApi("");
  } catch {
    // ignore
  }
}


/**
 * Subscribe to notification tap events.
 * Calls `handler` with the notification's data payload when the user
 * taps a notification (whether app was foreground, background, or killed).
 *
 * Returns a cleanup function.
 */
export function subscribeToNotificationTaps(handler) {
  // App was in foreground/background and user taps notification
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data || {};
    handler(data);
  });

  // App was completely killed; check if we were launched by tapping a notification
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) {
      const data = response.notification.request.content.data || {};
      handler(data);
    }
  });

  return () => sub.remove();
}
