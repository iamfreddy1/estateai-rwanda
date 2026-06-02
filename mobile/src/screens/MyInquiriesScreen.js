// ============================================
// MY INQUIRIES (renter side)
// ============================================
// Tracks every inquiry the current user has sent on rental listings, grouped
// by status. Tapping a card jumps to the rental detail screen.
import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Image, useColorScheme, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchMyInquiries } from "../api/rentals";
import { getColors } from "../theme/colors";

const TABS = [
  { k: "", l: "All" },
  { k: "open", l: "Open" },
  { k: "answered", l: "Answered" },
  { k: "closed", l: "Closed" },
];

function statusColor(s) {
  return { open: "#f59e0b", answered: "#10b981", dismissed: "#94a3b8", closed: "#475569" }[s] || "#64748b";
}

export default function MyInquiriesScreen({ navigation }) {
  const colors = getColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setErr(null);
    try { setItems(await fetchMyInquiries(tab || undefined)); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [tab]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>📨 My inquiries</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
          Track the rental inquiries you've sent and the landlord's responses.
        </Text>
      </View>

      {/* Status tabs */}
      <View style={{ flexDirection: "row", paddingHorizontal: 12, marginBottom: 8 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.k} onPress={() => setTab(t.k)}
            style={{ paddingHorizontal: 14, paddingVertical: 7, marginRight: 6, borderRadius: 16,
                     backgroundColor: tab === t.k ? colors.primary : colors.card,
                     borderColor: colors.border, borderWidth: 1 }}>
            <Text style={{ color: tab === t.k ? "#fff" : colors.text, fontWeight: "700", fontSize: 12 }}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {err && <Text style={{ color: "#ef4444", paddingHorizontal: 16, fontSize: 12 }}>{err}</Text>}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        {loading ? (
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>📨</Text>
            <Text style={{ color: colors.text, fontWeight: "700" }}>No inquiries yet</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: "center" }}>
              Open a rental from the Rent tab and tap{" "}
              <Text style={{ fontWeight: "700" }}>👁 Request viewing</Text> or{" "}
              <Text style={{ fontWeight: "700" }}>📞 Call</Text> to send your first inquiry.
            </Text>
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate("Home")}
              style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 10,
                       backgroundColor: colors.primary, borderRadius: 18 }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Browse rentals</Text>
            </TouchableOpacity>
          </View>
        ) : items.map(i => (
          <TouchableOpacity key={i.id}
            onPress={() => navigation.getParent()?.navigate("Buy", { screen: "PropertyDetails", params: { propertyId: i.property_id } })}
            activeOpacity={0.85}
            style={{ marginHorizontal: 12, marginBottom: 10, padding: 12, borderRadius: 14,
                     backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}>
            <View style={{ flexDirection: "row" }}>
              {i.property_image ? (
                <Image source={{ uri: i.property_image }} style={{ width: 70, height: 70, borderRadius: 10 }} />
              ) : (
                <View style={{ width: 70, height: 70, borderRadius: 10, backgroundColor: colors.bg }} />
              )}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: colors.text, fontWeight: "700" }} numberOfLines={1}>{i.property_title}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                  to {i.landlord?.name}{i.landlord?.agency_name ? ` · ${i.landlord.agency_name}` : ""}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                  <Text style={{ color: "#fff", backgroundColor: statusColor(i.status),
                                 fontSize: 10, fontWeight: "800", paddingHorizontal: 7, paddingVertical: 2,
                                 borderRadius: 6, textTransform: "uppercase", marginRight: 6 }}>
                    {i.status}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                    {i.kind === "viewing" ? "👁 Viewing" : i.kind === "call" ? "📞 Call" : "💬 Chat"}
                    {" · "}
                    {new Date(i.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
            {i.message && (
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8, fontStyle: "italic" }} numberOfLines={2}>
                You: “{i.message}”
              </Text>
            )}
            {i.response && (
              <View style={{ marginTop: 8, padding: 10, borderRadius: 10,
                             backgroundColor: colors.bg, borderLeftColor: "#10b981", borderLeftWidth: 3 }}>
                <Text style={{ color: "#10b981", fontSize: 10, fontWeight: "800" }}>LANDLORD REPLIED</Text>
                <Text style={{ color: colors.text, fontSize: 13, marginTop: 2 }}>{i.response}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
