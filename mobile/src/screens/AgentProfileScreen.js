// ============================================
// PUBLIC AGENT PROFILE SCREEN
// ============================================
// Shows agent bio + their listings. Open via tap from PropertyCard / chat header.

import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, useColorScheme, Linking, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getAgentProfileApi } from "../api/auth";
import { startConversationApi } from "../api/chat";
import { useAuth } from "../context/AuthContext";
import PropertyCard from "../components/PropertyCard";
import AgentBadge from "../components/AgentBadge";
import { getColors, spacing, radius } from "../theme/colors";


export default function AgentProfileScreen({ route, navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { user } = useAuth();
  const { agentId } = route.params || {};

  const [agent, setAgent] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    getAgentProfileApi(agentId)
      .then((data) => { if (!cancel) { setAgent(data.agent); setListings(data.listings || []); } })
      .catch((err) => { if (!cancel) setError(err.message); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [agentId]);

  function handleCall() {
    if (agent?.phone) Linking.openURL(`tel:${agent.phone.replace(/\s+/g, "")}`);
  }

  async function handleMessage() {
    // Need a property to start a chat (current chat model is per-property).
    // If the agent has at least one listing, use the most recent.
    if (!user) return Alert.alert("Login required", "Please log in to message this agent.");
    if (!listings.length) return Alert.alert("No listings", "This agent has no listings to message about yet.");
    try {
      const convo = await startConversationApi(listings[0].id);
      navigation.getParent()?.navigate("Messages", {
        screen: "Chat",
        params: {
          conversationId: convo.id,
          otherName: convo.other_user?.name,
          propertyTitle: convo.property_title,
        },
      });
    } catch (err) {
      Alert.alert("Could not start chat", err.message);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]} edges={["top"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (error || !agent) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]} edges={["top"]}>
        <Text style={{ fontSize: 56 }}>😕</Text>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 8 }}>Agent not found</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{error || "This agent profile is unavailable."}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}
          style={[styles.btn, { backgroundColor: colors.primary, marginTop: spacing.lg }]}>
          <Text style={styles.btnTxt}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const initial = (agent.name || agent.email || "?")[0].toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backTxt}>←</Text>
          </TouchableOpacity>

          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{initial}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: spacing.sm }}>
            <Text style={styles.name}>{agent.name || "—"}</Text>
            <AgentBadge size={18} />
          </View>
          {agent.agency_name && (
            <Text style={styles.agency}>🏢 {agent.agency_name}</Text>
          )}
          {agent.areas && (
            <Text style={styles.areas}>📍 {agent.areas}</Text>
          )}
        </View>

        {/* Contact buttons */}
        <View style={styles.contactRow}>
          {agent.phone && (
            <TouchableOpacity style={[styles.cBtn, { backgroundColor: colors.success }]}
              onPress={handleCall} activeOpacity={0.85}>
              <Text style={styles.cBtnTxt}>📞 Call</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.cBtn, { backgroundColor: colors.primary }]}
            onPress={handleMessage} activeOpacity={0.85}>
            <Text style={styles.cBtnTxt}>💬 Message</Text>
          </TouchableOpacity>
        </View>

        {/* Bio */}
        {agent.bio && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>ABOUT</Text>
            <Text style={[styles.bio, { color: colors.text }]}>{agent.bio}</Text>
          </View>
        )}

        {/* License + email */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>VERIFIED INFO</Text>
          <Text style={[styles.row, { color: colors.text }]}>📋 License: {agent.license_number || "—"}</Text>
          <Text style={[styles.row, { color: colors.text }]}>✉️ {agent.email}</Text>
        </View>

        {/* Listings */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Listings ({listings.length})
          </Text>
          {listings.length === 0 ? (
            <Text style={{ color: colors.textMuted, marginBottom: spacing.lg }}>
              This agent has no active listings yet.
            </Text>
          ) : listings.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              currentUserId={user?.id}
              onPress={() => navigation.navigate("PropertyDetails", { propertyId: p.id })}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  hero: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl, alignItems: "center" },
  backBtn: {
    position: "absolute", top: spacing.md, left: spacing.md,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  backTxt: { color: "#fff", fontSize: 22, fontWeight: "800" },

  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center", marginTop: 8,
  },
  avatarTxt: { color: "#fff", fontSize: 36, fontWeight: "800" },
  name: { color: "#fff", fontSize: 22, fontWeight: "800" },
  agency: { color: "rgba(255,255,255,0.95)", fontSize: 14, marginTop: 4 },
  areas: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },

  contactRow: { flexDirection: "row", gap: spacing.sm, padding: spacing.lg },
  cBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.lg, alignItems: "center" },
  cBtnTxt: { color: "#fff", fontWeight: "800" },

  card: {
    margin: spacing.lg, marginTop: 0, padding: spacing.lg,
    borderRadius: radius.lg, borderWidth: 1,
  },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5, marginBottom: 6 },
  bio: { fontSize: 14, lineHeight: 20 },
  row: { fontSize: 14, paddingVertical: 4 },

  sectionTitle: { fontSize: 18, fontWeight: "800", marginVertical: spacing.md },
  btn: { paddingVertical: 12, paddingHorizontal: spacing.xl, borderRadius: radius.lg },
  btnTxt: { color: "#fff", fontWeight: "700" },
});
