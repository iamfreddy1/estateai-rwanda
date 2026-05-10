// ============================================
// ADMIN: PENDING LISTINGS
// ============================================
// Shows all pending properties + approve/reject buttons.

import { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image,
  Alert, RefreshControl, useColorScheme,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  listPropertiesApi,
  adminApprovePropertyApi,
  adminRejectPropertyApi,
} from "../api/properties";
import { formatRWF } from "../utils/format";
import { getColors, spacing, radius } from "../theme/colors";

const FALLBACK = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800";

export default function AdminPendingScreen({ navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);  // currently-acting-on property id
  const [errorMsg, setErrorMsg] = useState(null);

  const load = useCallback(async () => {
    setErrorMsg(null);
    try {
      const props = await listPropertiesApi({ status: "pending" });
      setItems(props);
    } catch (err) {
      console.log("[admin-listings] load error:", err.message);
      setErrorMsg(err.message);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleApprove(id) {
    setBusy(id);
    try {
      await adminApprovePropertyApi(id);
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      Alert.alert("Approve failed", err.message);
    } finally {
      setBusy(null);
    }
  }

  function handleReject(id) {
    Alert.prompt(
      "Reject listing",
      "Reason (shown to seller):",
      async (reason) => {
        if (!reason) return;
        setBusy(id);
        try {
          await adminRejectPropertyApi(id, reason);
          setItems((prev) => prev.filter((p) => p.id !== id));
        } catch (err) {
          Alert.alert("Reject failed", err.message);
        } finally {
          setBusy(null);
        }
      }
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🛡 Pending Listings</Text>
        <Text style={styles.sub}>
          {loading ? "Loading..." : `${items.length} awaiting review`}
        </Text>
      </View>

      {errorMsg && !loading && (
        <View style={{
          margin: spacing.lg,
          padding: spacing.md,
          backgroundColor: colors.danger + "15",
          borderColor: colors.danger,
          borderWidth: 1,
          borderRadius: radius.md,
        }}>
          <Text style={{ color: colors.danger, fontWeight: "700" }}>⚠️ {errorMsg}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
            Server may be waking up — pull down to refresh in 30s.
          </Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(it) => it.id.toString()}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading && !errorMsg && (
            <View style={styles.empty}>
              <Text style={{ fontSize: 56 }}>🎉</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>All caught up</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                No pending listings to review. (For pending USER ID verifications, see "Admin: Users".)
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image source={{ uri: item.image || FALLBACK }} style={styles.thumb} />
            <View style={{ padding: spacing.md }}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.cardPrice, { color: colors.primary }]}>
                {formatRWF(item.price, { compact: true })}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                📍 {item.sector}, {item.district} · by {item.owner_name}
              </Text>

              {item.ownership_doc_url ? (
                <TouchableOpacity onPress={() => Alert.alert("Document URL", item.ownership_doc_url)}>
                  <Text style={[styles.docLink, { color: colors.info }]}>📎 View ownership doc</Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ color: colors.warning, fontSize: 12, marginTop: 4 }}>
                  ⚠️ No ownership document attached
                </Text>
              )}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                  onPress={() => handleReject(item.id)}
                  disabled={busy === item.id}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionTxt}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.success }]}
                  onPress={() => handleApprove(item.id)}
                  disabled={busy === item.id}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionTxt}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg, paddingTop: spacing.md },
  back: { fontSize: 22, color: "#fff", fontWeight: "800" },
  title: { fontSize: 22, color: "#fff", fontWeight: "800", marginTop: 8 },
  sub: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 },

  empty: { alignItems: "center", paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginTop: spacing.md },

  card: {
    borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, overflow: "hidden",
  },
  thumb: { width: "100%", height: 160 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardPrice: { fontSize: 18, fontWeight: "800", marginVertical: 2 },
  docLink: { fontSize: 13, fontWeight: "700", marginTop: 6 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  actionBtn: {
    flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: "center",
  },
  actionTxt: { color: "#fff", fontWeight: "700" },
});
