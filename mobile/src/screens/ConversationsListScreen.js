// ============================================
// CONVERSATIONS LIST SCREEN
// ============================================
// Shows all of the user's conversations with a counterpart name,
// last message preview, time, and unread badge.
// Live-updates via socket "conversation_updated" events.

import { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet,
  RefreshControl, useColorScheme,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { listConversationsApi } from "../api/chat";
import { onChatEvent, getChatSocket } from "../sockets/chatSocket";
import { getColors, spacing, radius } from "../theme/colors";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400";


export default function ConversationsListScreen({ navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setConvos(await listConversationsApi());
    } catch (e) {
      // ignore
    }
  }, []);

  // Reload every time screen comes into focus
  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]));

  // Subscribe to live updates
  useEffect(() => {
    const unsub = onChatEvent("conversation_updated", (payload) => {
      const updated = payload?.conversation;
      if (!updated) return;
      setConvos((prev) => {
        // Replace if exists, else prepend
        const idx = prev.findIndex((c) => c.id === updated.id);
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = updated;
          return next.sort((a, b) => (b.last_message_at || "").localeCompare(a.last_message_at || ""));
        }
        return [updated, ...prev];
      });
    });
    return unsub;
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.title}>💬 Messages</Text>
        <Text style={styles.sub}>
          {loading ? "Loading..." : `${convos.length} conversation${convos.length === 1 ? "" : "s"}`}
          {"  ·  "}
          {getChatSocket()?.connected ? "🟢 live" : "⚪ offline"}
        </Text>
      </View>

      <FlatList
        data={convos}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Text style={{ fontSize: 56 }}>💬</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No conversations yet</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4, textAlign: "center", paddingHorizontal: spacing.xxl }}>
                Tap "Contact Seller" on any property to start a chat.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ConversationRow
            item={item}
            colors={colors}
            onPress={() =>
              navigation.navigate("Chat", {
                conversationId: item.id,
                otherName: item.other_user?.name,
                propertyTitle: item.property_title,
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}


function ConversationRow({ item, colors, onPress }) {
  const initial = (item.other_user?.name || "?").trim()[0]?.toUpperCase() || "?";
  const time = item.last_message_at ? formatTime(item.last_message_at) : "";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.row, { borderBottomColor: colors.border }]}
    >
      {/* Avatar (other user's avatar OR initial) */}
      {item.other_user?.avatar_url ? (
        <Image source={{ uri: item.other_user.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarFallback, { backgroundColor: colors.primary + "30" }]}>
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 20 }}>{initial}</Text>
        </View>
      )}

      {/* Texts */}
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {item.other_user?.name || "Unknown"}
          </Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>{time}</Text>
        </View>

        <Text style={[styles.property, { color: colors.textSecondary }]} numberOfLines={1}>
          🏠 {item.property_title || "Property"}
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={[styles.preview, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.last_message || "No messages yet"}
          </Text>
          {item.unread_count > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.danger }]}>
              <Text style={styles.badgeText}>{item.unread_count}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Property thumbnail */}
      {item.property_image && (
        <Image source={{ uri: item.property_image || FALLBACK_IMG }} style={styles.propertyThumb} />
      )}
    </TouchableOpacity>
  );
}


function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now - d) / (1000 * 60 * 60);
  if (diffH < 1) {
    const m = Math.floor((now - d) / (1000 * 60));
    return m <= 0 ? "now" : `${m}m`;
  }
  if (diffH < 24) return `${Math.floor(diffH)}h`;
  if (diffH < 24 * 7) return `${Math.floor(diffH / 24)}d`;
  return d.toLocaleDateString();
}


const styles = StyleSheet.create({
  header: { padding: spacing.lg, paddingTop: spacing.md },
  title: { fontSize: 24, color: "#fff", fontWeight: "800" },
  sub: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
  },
  name: { fontSize: 15, fontWeight: "800", flex: 1 },
  time: { fontSize: 11, fontWeight: "600", marginLeft: spacing.sm },
  property: { fontSize: 12, marginTop: 1 },
  preview: { fontSize: 13, marginTop: 2, flex: 1 },
  badge: {
    minWidth: 22, height: 22, paddingHorizontal: 6,
    borderRadius: 11, alignItems: "center", justifyContent: "center",
    marginLeft: spacing.sm,
  },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 11 },

  propertyThumb: {
    width: 44, height: 44, borderRadius: radius.sm, marginLeft: spacing.md,
  },

  empty: { alignItems: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginTop: spacing.md },
});
