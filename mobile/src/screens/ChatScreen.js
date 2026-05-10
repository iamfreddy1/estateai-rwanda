// ============================================
// CHAT SCREEN
// ============================================
// Real-time conversation between buyer and seller about a property.
// - Loads message history via REST
// - Subscribes to "new_message" via socket
// - Sends via socket (REST fallback if socket disconnected)
// - Auto-scrolls to bottom on new messages
// - Marks unread as read when opened

import { useEffect, useRef, useState } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Image, useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import { listMessagesApi, sendMessageApi, markReadApi } from "../api/chat";
import {
  joinConversation, leaveConversation,
  sendMessageOverSocket, onChatEvent, getChatSocket,
} from "../sockets/chatSocket";
import { getColors, spacing, radius } from "../theme/colors";


export default function ChatScreen({ route, navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { user } = useAuth();
  const { conversationId, otherName, propertyTitle } = route.params || {};

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const listRef = useRef(null);

  // ---------- Load history + join socket room ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const msgs = await listMessagesApi(conversationId, { limit: 100 });
        if (!cancelled) setMessages(msgs);
        // mark read once history loaded
        markReadApi(conversationId).catch(() => {});
      } catch (e) {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    joinConversation(conversationId);

    return () => {
      cancelled = true;
      leaveConversation(conversationId);
    };
  }, [conversationId]);

  // ---------- Subscribe to new_message ----------
  useEffect(() => {
    const unsub = onChatEvent("new_message", (msg) => {
      if (!msg || msg.conversation_id !== conversationId) return;
      setMessages((prev) => {
        // Avoid duplicates if we also get our own message echoed
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // mark read since we're looking at it
      markReadApi(conversationId).catch(() => {});
    });
    return unsub;
  }, [conversationId]);

  // ---------- Auto-scroll to bottom on new messages ----------
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  // ---------- Send ----------
  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setDraft("");

    // Try socket first (instant)
    const socket = getChatSocket();
    if (socket && socket.connected) {
      sendMessageOverSocket(conversationId, text);
      setSending(false);
      // The "new_message" event will deliver our own message back
    } else {
      // Fallback to REST
      try {
        const msg = await sendMessageApi(conversationId, text);
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } catch (e) {
        // restore draft on failure
        setDraft(text);
      } finally {
        setSending(false);
      }
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backWrap}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{otherName || "Chat"}</Text>
          {propertyTitle && (
            <Text style={styles.sub} numberOfLines={1}>🏠 {propertyTitle}</Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Message list */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id.toString()}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.lg }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ fontSize: 56 }}>💬</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No messages yet</Text>
                <Text style={{ color: colors.textSecondary, marginTop: 4, textAlign: "center" }}>
                  Say hello!
                </Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const isMine = item.sender_id === user?.id;
              const prev = messages[index - 1];
              const showDate = !prev || !sameDay(prev.created_at, item.created_at);
              return (
                <View>
                  {showDate && (
                    <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
                      {formatDate(item.created_at)}
                    </Text>
                  )}
                  <Bubble message={item} isMine={isMine} colors={colors} />
                </View>
              );
            }}
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            style={[styles.input, {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
            }]}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!draft.trim() || sending}
            style={[styles.sendBtn, {
              backgroundColor: !draft.trim() || sending ? colors.textMuted : colors.primary,
            }]}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


function Bubble({ message, isMine, colors }) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <View style={[styles.bubbleRow, { justifyContent: isMine ? "flex-end" : "flex-start" }]}>
      <View
        style={[
          styles.bubble,
          isMine
            ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: colors.card, borderBottomLeftRadius: 4, borderColor: colors.border, borderWidth: 1 },
        ]}
      >
        <Text style={{ color: isMine ? "#fff" : colors.text, fontSize: 15, lineHeight: 20 }}>
          {message.content}
        </Text>
        <Text
          style={{
            color: isMine ? "rgba(255,255,255,0.75)" : colors.textMuted,
            fontSize: 10, marginTop: 4, textAlign: "right",
          }}
        >
          {time}{isMine && message.read_at ? " ✓✓" : isMine ? " ✓" : ""}
        </Text>
      </View>
    </View>
  );
}


function sameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.toDateString() === db.toDateString();
}

function formatDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
}


const styles = StyleSheet.create({
  header: {
    padding: spacing.md, paddingTop: spacing.md,
    flexDirection: "row", alignItems: "center",
  },
  backWrap: { paddingRight: spacing.md, paddingVertical: 4 },
  back: { fontSize: 22, color: "#fff", fontWeight: "800" },
  title: { fontSize: 17, color: "#fff", fontWeight: "800" },
  sub: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginTop: spacing.md },

  dateLabel: {
    textAlign: "center", marginVertical: spacing.md,
    fontSize: 11, fontWeight: "700",
  },

  bubbleRow: { flexDirection: "row", marginVertical: 2, paddingHorizontal: 4 },
  bubble: {
    maxWidth: "78%", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
  },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.sm,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40, maxHeight: 120,
    borderWidth: 1, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    fontSize: 15,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    marginLeft: spacing.sm,
  },
});
