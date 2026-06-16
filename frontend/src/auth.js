// ============================================
// AUTHENTICATION HELPER
// ============================================
// Wraps localStorage to manage the JWT token + cached user info.
// Also provides API helpers for signup, login, and "who am I?".

//const API_URL = "https://estateai-backend-0ncb.onrender.com";
const API_URL = "https://estateai-backend-0ncb.onrender.com";
const TOKEN_KEY = "estateai_token";
const USER_KEY = "estateai_user";

// ---------- Storage helpers ----------
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ---------- API calls ----------
// Each returns the parsed JSON response, or throws an error with the message.

export async function signupApi({ email, password, name }) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Signup failed");
  return data;
}

export async function loginApi({ email, password }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data;
}

// Verifies the stored token is still valid. Returns user object or null.
export async function fetchMe() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

// ============================================
// Forgot password — sends a 6-digit code to the user's email
// ============================================
export async function forgotPasswordApi(email) {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not send reset code");
  return data;
}

// ============================================
// Reset password — submit the 6-digit code + new password
// ============================================
export async function resetPasswordApi(email, code, new_password) {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, new_password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Reset failed");
  return data;
}

// ============================================
// Remembered email (localStorage) — for the "Remember me" checkbox on login
// ============================================
const REMEMBER_KEY = "estateai_remember_email";

export function getRememberedEmail() {
  try { return localStorage.getItem(REMEMBER_KEY) || ""; }
  catch { return ""; }
}

export function setRememberedEmail(email) {
  try { localStorage.setItem(REMEMBER_KEY, email || ""); }
  catch {}
}

export function clearRememberedEmail() {
  try { localStorage.removeItem(REMEMBER_KEY); }
  catch {}
}
