// ============================================
// ADMIN: PENDING USER VERIFICATIONS
// ============================================
// Lists users awaiting ID verification. Admin can approve/reject.

import { useCallback, useState } from "react";
import {
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet,
  RefreshControl, useColorScheme, Alert, ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  adminListPendingUsersApi,
  adminVerifyUserApi,
  adminRejectUserApi,
} from "../api/auth";
import { getColors, spacing, radius } from "../theme/colors";


export default function AdminPendingUsersScreen({ navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const load = useCallback(async () => {
    setErrorMsg(null);
    try {
      const list = await adminListPendingUsersApi();
      setItems(list);
    } catch (err) {
      console.log("[admin-users] load error:", err.message);
      setErrorMsg(err.message);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]));

  async function onRefresh() {
    setRefreshing(true); await load(); setRefreshing(false);
  }

  async function handleApprove(uid) {
    setBusy(uid);
    try {
      await adminVerifyUserApi(uid);
      setItems((prev) => prev.filter((u) => u.id !== uid));
    } catch (err) {
      Alert.alert("Approve failed", err.message);
    } finally { setBusy(null); }
  }

  function handleReject(uid) {
    Alert.prompt
      ? Alert.prompt("Reject user", "Reason (shown to user):", async (reason) => {
          if (!reason) return;
          await doReject(uid, reason);
        })
      : doReject(uid, "Documents unclear");
  }
  async function doReject(uid, reason) {
    setBusy(uid);
    try {
      await adminRejectUserApi(uid, reason);
      setItems((prev) => prev.filter((u) => u.id !== uid));
    } catch (err) {
      Alert.alert("Reject failed", err.message);
    } finally { setBusy(null); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: colors.primaryDark }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🪪 Pending User Verifications</Text>
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
            Server may be waking up — pull to refresh in 30s.
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
                No users waiting for verification.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.md }}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + "30" }]}>
                <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 20 }}>
                  {(item.name || item.email)[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[styles.name, { color: colors.text }]}>{item.name || "—"}</Text>
                <Text style={[styles.email, { color: colors.textSecondary }]}>{item.email}</Text>
              </View>
            </View>

            {item.national_id_url ? (
              <Image source={{ uri: item.national_id_url }} style={styles.idImage} resizeMode="contain" />
            ) : (
              <View style={[styles.noId, { backgroundColor: colors.cardAlt }]}>
                <Text style={{ color: colors.textMuted }}>No ID image attached</Text>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.danger }]}
                onPress={() => handleReject(item.id)}
                disabled={busy === item.id}
                activeOpacity={0.85}
              >
                {busy === item.id ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.btnText}>Reject</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.success }]}
                onPress={() => handleApprove(item.id)}
                disabled={busy === item.id}
                activeOpacity={0.85}
              >
                {busy === item.id ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.btnText}>Approve</Text>
                )}
              </TouchableOpacity>
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
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
  },
  name: { fontSize: 15, fontWeight: "800" },
  email: { fontSize: 12, marginTop: 2 },

  idImage: { width: "100%", height: 240, backgroundColor: "#000" },
  noId: { padding: spacing.lg, alignItems: "center" },

  actions: { flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  btn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
});
