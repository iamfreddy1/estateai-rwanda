// ============================================
// AI CHAT SCREEN  (EstateAI Rwanda assistant)
// ============================================
// Real-time Q&A with EstateAI. Quick prompts, message bubbles, retry-on-fail,
// optimistic UI, auto-scroll. Conversation can be resumed by passing
// route.params.conversationId.

import { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, FlatList, KeyboardAvoidingView, Platform,
  TouchableOpacity, ActivityIndicator, useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sendAIChat, fetchAIConversation, fetchFAQ } from "../api/aiChat";
import { getColors } from "../theme/colors";

export default function AIChatScreen({ route }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState([]);
  const [convId, setConvId] = useState(route?.params?.conversationId || null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [faq, setFaq] = useState([]);
  const listRef = useRef(null);

  // Load curated FAQ once - instant answers, no LLM cost
  useEffect(() => {
    let alive = true;
    fetchFAQ().then(items => alive && setFaq(items)).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Tap a FAQ item: append the Q+A directly to the local chat (no network call).
  // If the user asks a follow-up afterwards, /ai/chat starts a real conversation.
  function tapFAQ(item) {
    setMessages(m => [
      ...m,
      { id: `faq-q-${item.id}-${Date.now()}`, role: "user", content: item.q },
      { id: `faq-a-${item.id}-${Date.now()}`, role: "assistant", content: item.a, fromFAQ: true },
    ]);
    scrollEnd();
  }

  // Resume an existing conversation
  useEffect(() => {
    let alive = true;
    if (convId) {
      fetchAIConversation(convId)
        .then((d) => alive && setMessages(d.messages || []))
        .catch((e) => alive && setError(e.message));
    }
    return () => { alive = false; };
  }, [convId]);

  const scrollEnd = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

  async function send(text) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || sending) return;
    setInput("");
    setError(null);
    const localId = `local-${Date.now()}`;
    setMessages((m) => [...m, { id: localId, role: "user", content: trimmed, pending: true }]);
    setSending(true);
    scrollEnd();
    try {
      const data = await sendAIChat(trimmed, convId);
      if (!convId) setConvId(data.conversation_id);
      setMessages((m) => [
        ...m.map((x) => (x.id === localId ? { ...x, pending: false } : x)),
        { id: data.message_id, role: "assistant", content: data.reply },
      ]);
      scrollEnd();
    } catch (e) {
      setError(e.message || "Failed to send");
      setMessages((m) =>
        m.map((x) => (x.id === localId ? { ...x, pending: false, failed: true } : x))
      );
    } finally {
      setSending(false);
    }
  }

  const renderItem = ({ item }) => {
    const mine = item.role === "user";
    return (
      <View
        style={{
          alignSelf: mine ? "flex-end" : "flex-start",
          backgroundColor: mine ? colors.primary : colors.card,
          borderRadius: 16,
          padding: 12,
          marginVertical: 4,
          marginHorizontal: 12,
          maxWidth: "84%",
          opacity: item.pending ? 0.55 : 1,
          borderColor: colors.border,
          borderWidth: mine ? 0 : 1,
        }}
      >
        {!mine && (
          <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>
            {item.fromFAQ ? "📚 EstateAI · Quick answer" : "🤖 EstateAI"}
          </Text>
        )}
        <Text style={{ color: mine ? "#fff" : colors.text, fontSize: 15, lineHeight: 21 }}>
          {item.content}
        </Text>
        {item.created_at && (
          <Text style={{ color: mine ? "rgba(255,255,255,0.7)" : colors.textMuted,
                         fontSize: 10, marginTop: 4, textAlign: mine ? "right" : "left" }}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        )}
        {item.failed && (
          <TouchableOpacity onPress={() => send(item.content)} style={{ marginTop: 6 }}>
            <Text style={{ color: "#fca5a5", fontSize: 12, fontWeight: "600" }}>
              Failed — tap to retry
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const showPrompts = messages.length === 0 && !sending;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          showPrompts ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 6 }}>
                Hi! I’m EstateAI 🇷🇼
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 14, marginBottom: 18, lineHeight: 20 }}>
                Tap a common question for an instant answer, or type your own to ask the AI.
              </Text>
              {Object.entries(
                faq.reduce((acc, item) => {
                  (acc[item.category] = acc[item.category] || []).push(item);
                  return acc;
                }, {})
              ).map(([cat, items]) => (
                <View key={cat} style={{ marginBottom: 10 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "700",
                                 letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                    {cat}
                  </Text>
                  {items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => tapFAQ(item)}
                      style={{
                        padding: 12, marginBottom: 6, borderRadius: 12,
                        backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 14 }}>{item.q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          ) : null
        }
        ListFooterComponent={
          sending ? (
            <View style={{ padding: 12, marginLeft: 12, alignItems: "flex-start" }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 14,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                }}
              >
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={{ color: colors.textMuted, marginLeft: 8, fontSize: 13 }}>
                  EstateAI is typing…
                </Text>
              </View>
            </View>
          ) : null
        }
      />

      {error && (
        <Text
          style={{
            color: "#ef4444", textAlign: "center",
            paddingHorizontal: 16, paddingBottom: 4, fontSize: 13,
          }}
        >
          {error}
        </Text>
      )}

      <View
        style={{
          flexDirection: "row",
          padding: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          alignItems: "flex-end",
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask EstateAI…"
          placeholderTextColor={colors.textMuted}
          editable={!sending}
          multiline
          style={{
            flex: 1,
            color: colors.text,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: colors.bg,
            borderRadius: 20,
            maxHeight: 120,
            borderColor: colors.border,
            borderWidth: 1,
          }}
        />
        <TouchableOpacity
          onPress={() => send()}
          disabled={sending || !input.trim()}
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 16,
            marginLeft: 8,
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            height: 44,
            opacity: sending || !input.trim() ? 0.5 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>{sending ? "…" : "Send"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
