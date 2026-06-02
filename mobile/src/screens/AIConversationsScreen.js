// ============================================
// AI CHAT HISTORY (list past conversations)
// ============================================
import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, useColorScheme,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { fetchAIHistory, deleteAIConversation } from "../api/aiChat";
import { getColors } from "../theme/colors";

function timeAgo(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function AIConversationsScreen({ navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await fetchAIHistory();
      setConvs(list);
    } catch (e) {
      Alert.alert("Couldn't load history", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // refresh whenever the screen is focused (so new chats appear instantly)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmDelete(id) {
    Alert.alert("Delete conversation?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAIConversation(id);
            setConvs((c) => c.filter((x) => x.id !== id));
          } catch (e) { Alert.alert("Delete failed", e.message); }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={convs}
        keyExtractor={(c) => String(c.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🤖</Text>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, marginBottom: 4 }}>
              No conversations yet
            </Text>
            <Text style={{ color: colors.textMuted, textAlign: "center", fontSize: 13 }}>
              Tap “New chat” below to ask EstateAI anything about Kigali real estate.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate("AIChat", { conversationId: item.id })}
            onLongPress={() => confirmDelete(item.id)}
            style={{
              padding: 14, marginHorizontal: 12, marginTop: 10,
              backgroundColor: colors.card, borderRadius: 12,
              borderColor: colors.border, borderWidth: 1,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14, flex: 1 }} numberOfLines={1}>
                {item.title || "Conversation"}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginLeft: 8 }}>{timeAgo(item.updated_at)}</Text>
            </View>
            {item.last_message && (
              <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={2}>
                {item.last_message.role === "user" ? "You: " : "EstateAI: "}{item.last_message.content}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        onPress={() => navigation.navigate("AIChat")}
        style={{
          position: "absolute", right: 18, bottom: 22,
          backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 14,
          borderRadius: 28, elevation: 4,
          shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>＋ New chat</Text>
      </TouchableOpacity>
    </View>
  );
}
