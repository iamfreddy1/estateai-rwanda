// ============================================
// AI CHAT API HELPER
// ============================================
import apiClient from "./client";

export async function sendAIChat(message, conversationId = null) {
  const body = conversationId ? { message, conversation_id: conversationId } : { message };
  const { data } = await apiClient.post("/ai/chat", body);
  return data;
}

export async function fetchAIHistory() {
  const { data } = await apiClient.get("/ai/history");
  return data.conversations || [];
}

export async function fetchAIConversation(id) {
  const { data } = await apiClient.get(`/ai/conversation/${id}`);
  return data;
}

export async function deleteAIConversation(id) {
  await apiClient.delete(`/ai/conversation/${id}`);
}


export async function fetchFAQ() {
  const { data } = await apiClient.get("/ai/faq");
  return data.items || [];
}
