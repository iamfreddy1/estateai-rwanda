// ============================================
// ADMIN: PENDING AGENT APPLICATIONS
// ============================================

import { useCallback, useState } from "react";
import {
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet,
  RefreshControl, useColorScheme, Alert, ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  adminListPendingAgentsApi,
  adminApproveAgentApi,
  adminRejectAgentApi,
} from "../api/auth";
import { getColors, spacing, radius } from "../theme/colors";


export default function AdminPendingAgentsScreen({ navigation }) {
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
      setItems(await adminListPendingAgentsApi());
    } catch (err) {
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
      await adminApproveAgentApi(uid);
      setItems((prev) => prev.filter((u) => u.id !== uid));
    } catch (err) {
      Alert.alert("Approve failed", err.message);
    } finally { setBusy(null); }
  }

  function handleReject(uid) {
    Alert.prompt
      ? Alert.prompt("Reject application", "Reason (shown to applicant):", async (reason) => {
          if (!reason) return;
          await doReject(uid, reason);
        })
      : doReject(uid, "License not verifiable");
  }
  async function doReject(uid, reason) {
    setBusy(uid);
    try {
      await adminRejectAgentApi(uid, reason);
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
        <Text style={styles.title}>👔 Agent Applications</Text>
        <Text style={styles.sub}>
          {loading ? "Loading..." : `${items.length} pending`}
        </Text>
      </View>

      {errorMsg && !loading && (
        <View style={{
          margin: spacing.lg, padding: spacing.md,
          backgroundColor: colors.danger + "15",
          borderColor: colors.danger, borderWidth: 1, borderRadius: radius.md,
        }}>
          <Text style={{ color: colors.danger, fontWeight: "700" }}>⚠️ {errorMsg}</Text>
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
                No agent applications pending.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ padding: spacing.md }}>
              <Text style={[styles.name, { color: colors.text }]}>{item.name || item.email}</Text>
              <Text style={[styles.row, { color: colors.textSecondary }]}>🏢 {item.agency_name}</Text>
              <Text style={[styles.row, { color: colors.textSecondary }]}>📋 License: {item.license_number}</Text>
              <Text style={[styles.row, { color: colors.textSecondary }]}>📞 {item.phone}</Text>
              {item.areas && <Text style={[styles.row, { color: colors.textSecondary }]}>📍 {item.areas}</Text>}
              {item.bio && <Text style={[styles.bio, { color: colors.text }]}>"{item.bio}"</Text>}
            </View>

            {item.license_doc_url ? (
              <Image source={{ uri: item.license_doc_url }} style={styles.docImage} resizeMode="contain" />
            ) : (
              <View style={[styles.noDoc, { backgroundColor: colors.cardAlt }]}>
                <Text style={{ color: colors.textMuted }}>No license document attached</Text>
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
  name: { fontSize: 16, fontWeight: "800" },
  row: { fontSize: 13, marginTop: 4 },
  bio: { fontSize: 13, fontStyle: "italic", marginTop: 8 },

  docImage: { width: "100%", height: 240, backgroundColor: "#000" },
  noDoc: { padding: spacing.lg, alignItems: "center" },

  actions: { flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  btn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
});
