// ============================================
// ADMIN API HELPERS
// ============================================
// All admin endpoints require a valid JWT from an account with is_admin=true.
// The backend enforces this server-side; we still hide the UI for non-admins.
import { getToken } from "../auth";

const API_URL = "https://estateai-backend-0ncb.onrender.com";  // production

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function jsonOrThrow(res) {
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON body */ }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (HTTP ${res.status})`);
  return data;
}

// ---- Pending users (identity verification) ----
export async function listPendingUsers() {
  const res = await fetch(`${API_URL}/auth/users/pending`, { headers: authHeaders() });
  const data = await jsonOrThrow(res);
  return data.users || [];
}

export async function verifyUser(userId) {
  const res = await fetch(`${API_URL}/auth/users/${userId}/verify`, {
    method: "POST", headers: authHeaders(),
  });
  const data = await jsonOrThrow(res);
  return data.user;
}

export async function rejectUser(userId, reason) {
  const res = await fetch(`${API_URL}/auth/users/${userId}/reject`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  const data = await jsonOrThrow(res);
  return data.user;
}

// ---- Pending agents (agent applications) ----
export async function listPendingAgents() {
  const res = await fetch(`${API_URL}/auth/agents/pending`, { headers: authHeaders() });
  const data = await jsonOrThrow(res);
  return data.users || [];
}

export async function approveAgent(uid) {
  const res = await fetch(`${API_URL}/auth/agents/${uid}/approve`, {
    method: "POST", headers: authHeaders(),
  });
  const data = await jsonOrThrow(res);
  return data.user;
}

export async function rejectAgent(uid, reason) {
  const res = await fetch(`${API_URL}/auth/agents/${uid}/reject`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  const data = await jsonOrThrow(res);
  return data.user;
}

// ============================================
// NEW: dashboard stats / timeseries / activity
// ============================================
export async function getStats() {
  const res = await fetch(`${API_URL}/admin/stats`, { headers: authHeaders() });
  return await jsonOrThrow(res);
}

export async function getTimeseries(days = 30) {
  const res = await fetch(`${API_URL}/admin/timeseries?days=${days}`, { headers: authHeaders() });
  return await jsonOrThrow(res);
}

export async function getTopSectors() {
  const res = await fetch(`${API_URL}/admin/sectors-top`, { headers: authHeaders() });
  const data = await jsonOrThrow(res);
  return data.sectors || [];
}

export async function getActivity(limit = 20) {
  const res = await fetch(`${API_URL}/admin/activity?limit=${limit}`, { headers: authHeaders() });
  const data = await jsonOrThrow(res);
  return data.items || [];
}

// ============================================
// NEW: property moderation
// ============================================
export async function listPendingProperties(page = 1) {
  const res = await fetch(`${API_URL}/admin/properties/pending?page=${page}`, { headers: authHeaders() });
  return await jsonOrThrow(res);
}
export async function approveProperty(id) {
  const res = await fetch(`${API_URL}/admin/properties/${id}/approve`, { method: "POST", headers: authHeaders() });
  return await jsonOrThrow(res);
}
export async function rejectProperty(id, reason) {
  const res = await fetch(`${API_URL}/admin/properties/${id}/reject`, {
    method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  return await jsonOrThrow(res);
}
export async function featureProperty(id, featured = true) {
  const res = await fetch(`${API_URL}/admin/properties/${id}/feature`, {
    method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ featured }),
  });
  return await jsonOrThrow(res);
}

// ============================================
// NEW: all-user management
// ============================================
export async function listUsers({ page = 1, per_page = 25, q = "", status = "" } = {}) {
  const params = new URLSearchParams({ page, per_page });
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  const res = await fetch(`${API_URL}/admin/users?${params}`, { headers: authHeaders() });
  return await jsonOrThrow(res);
}
export async function suspendUser(id, reason) {
  const res = await fetch(`${API_URL}/admin/users/${id}/suspend`, {
    method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  return await jsonOrThrow(res);
}
export async function unsuspendUser(id) {
  const res = await fetch(`${API_URL}/admin/users/${id}/unsuspend`, { method: "POST", headers: authHeaders() });
  return await jsonOrThrow(res);
}
export async function promoteUser(id) {
  const res = await fetch(`${API_URL}/admin/users/${id}/promote`, { method: "POST", headers: authHeaders() });
  return await jsonOrThrow(res);
}

// ============================================
// NEW: AI conversation review
// ============================================
export async function listAIConversations(page = 1) {
  const res = await fetch(`${API_URL}/admin/ai/conversations?page=${page}`, { headers: authHeaders() });
  return await jsonOrThrow(res);
}
export async function getAIConversationDetail(cid) {
  const res = await fetch(`${API_URL}/admin/ai/conversation/${cid}`, { headers: authHeaders() });
  return await jsonOrThrow(res);
}
