// ============================================
// AUTH API
// ============================================
// Wraps the /auth/* endpoints from your Flask backend.
// Token is stored in AsyncStorage and auto-attached by client.js.

import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "./client";

const TOKEN_KEY = "estateai_token";
const REFRESH_TOKEN_KEY = "estateai_refresh_token";
const USER_KEY  = "estateai_user";

// ---------- Storage helpers ----------
export async function getStoredToken() {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export async function getStoredUser() {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function getStoredRefreshToken() {
  return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function saveAuth(token, user, refreshToken = null) {
  const pairs = [[TOKEN_KEY, token], [USER_KEY, JSON.stringify(user)]];
  if (refreshToken) pairs.push([REFRESH_TOKEN_KEY, refreshToken]);
  await AsyncStorage.multiSet(pairs);
}

export async function refreshAccessTokenApi() {
  const rt = await getStoredRefreshToken();
  if (!rt) throw new Error("No refresh token");
  const res = await apiClient.post("/auth/refresh", null, {
    headers: { Authorization: `Bearer ${rt}` },
  });
  return res.data.token;       // new short-lived access token
}

export async function logoutApi() {
  // Server-side revoke. Safe to ignore failures (offline / token already revoked).
  try {
    const rt = await getStoredRefreshToken();
    if (rt) {
      await apiClient.post("/auth/logout", null, {
        headers: { Authorization: `Bearer ${rt}` },
      });
    }
  } catch {}
}

export async function clearAuth() {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
}

// ---------- API calls ----------
export async function signupApi({ email, password, name }) {
  const res = await apiClient.post("/auth/signup", { email, password, name });
  return res.data;            // { token, user, ... }
}

export async function loginApi({ email, password }) {
  const res = await apiClient.post("/auth/login", { email, password });
  return res.data;
}

// Verifies the stored token is still valid. Returns user or null.
export async function fetchMeApi() {
  const token = await getStoredToken();
  if (!token) return null;
  try {
    const res = await apiClient.get("/auth/me");
    return res.data.user;
  } catch {
    return null;
  }
}

// Sends the Google ID token to our backend for verification + JWT.
export async function googleAuthApi(idToken) {
  const res = await apiClient.post("/auth/google", { id_token: idToken });
  return res.data;            // { token, user, ... }
}

// After uploading the national ID image to Cloudinary, attach the URL
// to the user's account so admin can verify it.
export async function attachNationalIdApi(nationalIdUrl) {
  const res = await apiClient.post("/auth/upload-id", {
    national_id_url: nationalIdUrl,
  });
  return res.data;            // { user }
}

// Save (or clear) the device's Expo push token on the user's account.
// Call with empty string to UNregister on logout.
export async function registerPushTokenApi(expoPushToken) {
  const res = await apiClient.post("/auth/push-token", { token: expoPushToken });
  return res.data;            // { ok: true }
}

// ---------- Admin: pending user verifications ----------
export async function adminListPendingUsersApi() {
  const res = await apiClient.get("/auth/users/pending");
  return res.data.users;
}

export async function adminVerifyUserApi(userId) {
  const res = await apiClient.post(`/auth/users/${userId}/verify`);
  return res.data.user;
}

export async function adminRejectUserApi(userId, reason) {
  const res = await apiClient.post(`/auth/users/${userId}/reject`, { reason });
  return res.data.user;
}

// ---------- Agent flow ----------
export async function applyAsAgentApi(payload) {
  const res = await apiClient.post("/auth/agent/apply", payload);
  return res.data.user;
}

export async function getAgentProfileApi(agentId) {
  const res = await apiClient.get(`/agents/${agentId}`);
  return res.data;        // { agent, listings }
}

export async function adminListPendingAgentsApi() {
  const res = await apiClient.get("/auth/agents/pending");
  return res.data.users;
}

export async function adminApproveAgentApi(uid) {
  const res = await apiClient.post(`/auth/agents/${uid}/approve`);
  return res.data.user;
}

export async function adminRejectAgentApi(uid, reason) {
  const res = await apiClient.post(`/auth/agents/${uid}/reject`, { reason });
  return res.data.user;
}


// ---------- Forgot / reset password ----------
export async function forgotPasswordApi(email) {
  // Backend always returns 200 to prevent email enumeration
  const res = await apiClient.post("/auth/forgot-password", { email });
  return res.data;
}

export async function resetPasswordApi({ email, code, newPassword }) {
  const res = await apiClient.post("/auth/reset-password", {
    email, code, new_password: newPassword,
  });
  return res.data;
}
