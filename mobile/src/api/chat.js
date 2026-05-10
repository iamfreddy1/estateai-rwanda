// ============================================
// CHAT REST API
// ============================================
// Wraps /conversations and /conversations/:id/messages.
// (Real-time push comes via socket.io - see src/sockets/chatSocket.js)

import apiClient from "./client";

// POST /conversations  -> start (or reuse) a conversation about a property
export async function startConversationApi(propertyId) {
  const res = await apiClient.post("/conversations", { property_id: propertyId });
  return res.data.conversation;
}

// GET /conversations  -> list current user's conversations
export async function listConversationsApi() {
  const res = await apiClient.get("/conversations");
  return res.data.conversations;
}

// GET /conversations/<id>
export async function getConversationApi(cid) {
  const res = await apiClient.get(`/conversations/${cid}`);
  return res.data.conversation;
}

// GET /conversations/<id>/messages?limit=50&before=<msg_id>
export async function listMessagesApi(cid, { limit = 50, before } = {}) {
  const params = { limit };
  if (before) params.before = before;
  const res = await apiClient.get(`/conversations/${cid}/messages`, { params });
  return res.data.messages;
}

// POST /conversations/<id>/messages   (HTTP fallback - socket is preferred)
export async function sendMessageApi(cid, content) {
  const res = await apiClient.post(`/conversations/${cid}/messages`, { content });
  return res.data.message;
}

// POST /conversations/<id>/read
export async function markReadApi(cid) {
  const res = await apiClient.post(`/conversations/${cid}/read`, {});
  return res.data;
}
