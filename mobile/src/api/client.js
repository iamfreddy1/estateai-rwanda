// ============================================
// API CLIENT (axios instance)
// ============================================
// Points at the live Render backend - works from any network.

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Production backend URL (Render)
export const API_BASE_URL = "https://estateai-backend-0ncb.onrender.com";

// For local backend dev, swap the line above for:
// export const API_BASE_URL = "http://10.89.54.59:5000";

// Create the axios instance
// 60s timeout to tolerate Render free-tier cold starts (~30-50s on first hit).
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,            // 60s timeout
  headers: { "Content-Type": "application/json" },
});

// ============================================
// REQUEST INTERCEPTOR
// ============================================
// Auto-attaches the JWT token to every request if we have one stored.
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("estateai_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================
// RESPONSE INTERCEPTOR
// ============================================
// Normalizes errors so screens get a clean { message } error.
// Also: on 401 (expired/invalid token), wipe stored auth so RootNavigator
// boots the user to the Login screen instead of leaving them in a broken state.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      return Promise.reject(new Error(
        "Cannot reach server. Check your internet connection. (If the server is just waking up from idle, try again in 30 seconds.)"
      ));
    }

    const status = error.response.status;
    const data = error.response.data || {};
    const msg = data.error || data.msg || `Request failed (HTTP ${status})`;

    // 401 / 422 with "Token has expired" or "invalid token" -> auto-logout
    const tokenExpired =
      status === 401 || status === 422 ||
      /token.*expired|invalid.*token|signature.*verification/i.test(JSON.stringify(data));

    if (tokenExpired) {
      try {
        await AsyncStorage.multiRemove(["estateai_token", "estateai_user"]);
      } catch {}
      return Promise.reject(new Error("Session expired - please log in again"));
    }

    return Promise.reject(new Error(msg));
  }
);

// Warm-up ping - fires once at app startup. Wakes up Render's
// free-tier dyno so the user doesn't pay the cold-start delay later.
// We don't await it - it just runs in the background.
(function warmUp() {
  apiClient.get("/health").catch(() => {
    // Silent: if it fails, real requests will surface the error properly.
  });
})();

export default apiClient;
