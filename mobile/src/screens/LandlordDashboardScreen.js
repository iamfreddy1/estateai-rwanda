// ============================================
// LANDLORD DASHBOARD - my rentals, inquiries, stats
// ============================================
import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
  useColorScheme, Alert, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchLandlordStats, fetchLandlordInquiries, respondInquiry, setAvailability,
} from "../api/rentals";
import { getColors } from "../theme/colors";

function Stat({ label, value, color }) {
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: color }}>
      <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 4 }}>{value ?? "—"}</Text>
    </View>
  );
}

export default function LandlordDashboardScreen({ navigation }) {
  const colors = getColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [tab, setTab] = useState("open");
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, i] = await Promise.all([fetchLandlordStats(), fetchLandlordInquiries(tab)]);
      setStats(s); setInquiries(i);
    } catch (e) { setErr(e.message); }
    finally { setRefreshing(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const respond = async (iid, action, response) => {
    setBusy(iid); setErr(null);
    try { await respondInquiry(iid, { action, response }); await load(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(null); }
  };

  const markAvail = async (pid, availability) => {
    setBusy(pid); setErr(null);
    try { await setAvailability(pid, availability); await load(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(null); }
  };

  if (!stats) {
    return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      contentContainerStyle={{ padding: 16, paddingTop: Math.max(insets.top, 16) }}>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", marginBottom: 4 }}>🏘 Landlord dashboard</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 14 }}>Your rentals, inquiries and analytics.</Text>

      {/* Top stats row */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        <Stat label="Listings" value={stats.totals.listings} color="#2563eb" />
        <Stat label="Views" value={stats.totals.views} color="#9333ea" />
        <Stat label="Inquiries" value={stats.totals.inquiries} color="#10b981" />
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        <Stat label="Open inquiries" value={stats.totals.open_inquiries} color="#f59e0b" />
        <Stat label="Viewing reqs" value={stats.totals.viewing_requests} color="#ef4444" />
        <Stat label="Rented" value={stats.by_availability.rented || 0} color="#475569" />
      </View>
      {err && <Text style={{ color: "#ef4444", marginBottom: 8 }}>{err}</Text>}

      {/* Listings rollup with availability actions */}
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 8, marginBottom: 8 }}>My rentals</Text>
      {stats.listings.length === 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: 13, padding: 12 }}>You haven’t listed any rentals yet.</Text>
      ) : stats.listings.map(l => (
        <View key={l.id} style={{ padding: 12, marginBottom: 8, borderRadius: 12, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: colors.text, fontWeight: "700", flex: 1 }} numberOfLines={1}>{l.title}</Text>
            <Text style={{ color: colors.primary, fontWeight: "700", marginLeft: 8 }}>{Math.round(l.price).toLocaleString()} RWF</Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
            {l.views} views · {l.inquiries} inquiries · status: {l.availability}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8, gap: 6 }}>
            {l.availability !== "rented" && (
              <TouchableOpacity disabled={busy === l.id} onPress={() => markAvail(l.id, "rented")}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#475569" }}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>✓ Mark as Rented</Text>
              </TouchableOpacity>
            )}
            {l.availability === "rented" && (
              <TouchableOpacity disabled={busy === l.id} onPress={() => markAvail(l.id, "available")}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#10b981" }}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>↻ Make available</Text>
              </TouchableOpacity>
            )}
            {l.availability === "available" && (
              <TouchableOpacity disabled={busy === l.id} onPress={() => markAvail(l.id, "hidden")}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#94a3b8" }}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>👁 Hide</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}

      {/* Inquiries tabs */}
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 14, marginBottom: 8 }}>Inquiries</Text>
      <View style={{ flexDirection: "row", marginBottom: 10 }}>
        {[["open", "Open"], ["answered", "Answered"], ["closed", "Closed"]].map(([k, l]) => (
          <TouchableOpacity key={k} onPress={() => setTab(k)}
            style={{ paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderRadius: 16,
                     backgroundColor: tab === k ? colors.primary : colors.card,
                     borderColor: colors.border, borderWidth: 1 }}>
            <Text style={{ color: tab === k ? "#fff" : colors.text, fontWeight: "700", fontSize: 12 }}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {inquiries.length === 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: 13, padding: 12 }}>No {tab} inquiries.</Text>
      ) : inquiries.map(i => (
        <View key={i.id} style={{ padding: 12, marginBottom: 8, borderRadius: 12, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>
            {i.kind === "viewing" ? "👁 Viewing request" : i.kind === "call" ? "📞 Call request" : "💬 Chat"} · {i.renter?.name}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
            on “{i.property_title}” · {new Date(i.created_at).toLocaleString()}
          </Text>
          {i.message && <Text style={{ color: colors.text, fontSize: 13, marginTop: 6, fontStyle: "italic" }}>“{i.message}”</Text>}
          {i.viewing_date && <Text style={{ color: colors.text, fontSize: 12, marginTop: 4 }}>📅 Wants to visit on {new Date(i.viewing_date).toLocaleString()}</Text>}
          {i.kind === "call" && i.renter?.phone && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${i.renter.phone}`)} style={{ marginTop: 6 }}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>📞 Call {i.renter.phone}</Text>
            </TouchableOpacity>
          )}
          {tab === "open" && (
            <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
              <TouchableOpacity disabled={busy === i.id} onPress={() => {
                Alert.prompt
                  ? Alert.prompt("Reply", "Your response:", t => t && respond(i.id, "respond", t))
                  : respond(i.id, "respond", "Thanks for your interest — let’s arrange a viewing.");
              }}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#10b981" }}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>✓ Respond</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={busy === i.id} onPress={() => respond(i.id, "dismiss")}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#94a3b8" }}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}
          {i.response && <Text style={{ color: "#10b981", fontSize: 12, marginTop: 8, fontWeight: "600" }}>You replied: “{i.response}”</Text>}
        </View>
      ))}
    </ScrollView>
  );
}
