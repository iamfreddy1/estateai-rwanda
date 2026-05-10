// ============================================
// CHAT SOCKET CLIENT (singleton)
// ============================================
// One global socket instance. Connect after login, disconnect on logout.
// Exposes lightweight subscription helpers.

import { io } from "socket.io-client";
import { API_BASE_URL } from "../api/client";

let socket = null;

/**
 * Connect to the chat socket using a JWT.
 * Idempotent - calling multiple times is safe.
 */
export function connectChatSocket(token) {
  if (!token) return null;
  if (socket && socket.connected) return socket;

  socket = io(API_BASE_URL, {
    transports: ["websocket"],     // mobile prefers websocket directly
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => {
    console.log("[chat] socket connected:", socket.id);
  });
  socket.on("disconnect", (reason) => {
    console.log("[chat] socket disconnected:", reason);
  });
  socket.on("connect_error", (err) => {
    console.log("[chat] socket connect_error:", err?.message);
  });

  return socket;
}

export function disconnectChatSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getChatSocket() {
  return socket;
}

// ---------- Convenience wrappers ----------
export function joinConversation(conversationId) {
  if (!socket) return;
  socket.emit("join_conversation", { conversation_id: conversationId });
}

export function leaveConversation(conversationId) {
  if (!socket) return;
  socket.emit("leave_conversation", { conversation_id: conversationId });
}

export function sendMessageOverSocket(conversationId, content) {
  if (!socket) return false;
  socket.emit("send_message", { conversation_id: conversationId, content });
  return true;
}

// Subscribe to a server event. Returns an unsubscribe function.
export function onChatEvent(event, handler) {
  if (!socket) return () => {};
  socket.on(event, handler);
  return () => socket && socket.off(event, handler);
}
