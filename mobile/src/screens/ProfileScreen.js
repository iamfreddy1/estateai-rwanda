// ============================================
// PROFILE SCREEN (with dashboard)
// ============================================

import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useColorScheme } from "react-native";
import { fetchLandlordStats } from "../api/rentals";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import VerificationBadge from "../components/VerificationBadge";
import { getColors, spacing, radius } from "../theme/colors";

export default function ProfileScreen({ navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { user, logout } = useAuth();

  // Show the Landlord Dashboard card only when the user actually owns
  // at least one listing. Silent on failure (non-landlords get back 0).
  const [hasRentals, setHasRentals] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!user) { setHasRentals(false); return; }
    fetchLandlordStats()
      .then((s) => alive && setHasRentals((s?.totals?.listings || 0) > 0))
      .catch(() => alive && setHasRentals(false));
    return () => { alive = false; };
  }, [user]);

  const initial = (user?.name || user?.email || "U").trim()[0].toUpperCase();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{user?.name || user?.email?.split("@")[0]}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={{ marginTop: 8 }}>
            <VerificationBadge status={user?.verification_status} />
          </View>
        </View>

        {/* Verification CTA card (shows if not verified yet) */}
        {user?.verification_status !== "verified" && (
          <TouchableOpacity
            style={[styles.verifyCard, {
              backgroundColor: colors.warning + "15",
              borderColor: colors.warning,
            }]}
            onPress={() => navigation.navigate("VerifyIdentity")}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 30 }}>🪪</Text>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ color: colors.text, fontWeight: "800", fontSize: 15 }}>
                {user?.verification_status === "pending"
                  ? "ID under review"
                  : user?.verification_status === "rejected"
                  ? "Re-upload your ID"
                  : "Verify your identity"}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                {user?.verification_status === "pending"
                  ? "Admins are reviewing your photo ID."
                  : user?.verification_status === "rejected"
                  ? user?.rejection_reason || "Tap to re-submit"
                  : "Required to publish listings."}
              </Text>
            </View>
            <Text style={{ color: colors.warning, fontSize: 22, fontWeight: "800" }}>→</Text>
          </TouchableOpacity>
        )}

        {/* Quick actions grid */}
        <View style={styles.grid}>
          <Action
            emoji="❤️" label="Favorites" desc="Saved listings"
            color={colors.danger}
            colors={colors}
            onPress={() => navigation.navigate("Favorites")}
          />
          <Action
            emoji="➕" label="Add Listing" desc="Sell your property"
            color={colors.success}
            colors={colors}
            onPress={() => navigation.getParent()?.navigate("Sell")}
          />
          <Action
            emoji="🤖" label="AI Estimate" desc="Property valuation"
            color={colors.warning}
            colors={colors}
            onPress={() => navigation.getParent()?.navigate("AI")}
          />
          {hasRentals && (
            <>
              <Action
                emoji="🏘" label="Landlord Dashboard" desc="My rentals & inquiries"
                color={colors.primary}
                colors={colors}
                onPress={() => navigation.navigate("LandlordDashboard")}
              />
              <Action
                emoji="⭐" label={user?.is_premium ? "Premium active" : "Go Premium"} desc="Unlimited contact unlocks & boosted listings"
                color="#f59e0b" colors={colors}
                onPress={() => navigation.navigate("PremiumUpgrade")}
              />
            </>
          )}
          <Action
            emoji="💬" label="AI Assistant" desc="Chat with EstateAI"
            color={colors.info ?? colors.primary}
            colors={colors}
            onPress={() => navigation.navigate("AIConversations")}
          />
          <Action
            emoji="🏠" label="Browse" desc="Buy properties"
            color={colors.primary}
            colors={colors}
            onPress={() => navigation.getParent()?.navigate("Buy")}
          />
          <Action
            emoji="📝" label="My Listings" desc="See your properties"
            color={colors.info}
            colors={colors}
            onPress={() => navigation.navigate("MyListings")}
          />
          <Action
            emoji={user?.is_agent ? "✅" : "👔"}
            label={user?.is_agent ? "Agent Profile" : "Become an Agent"}
            desc={user?.is_agent ? "View your agent page" : "Get a verified badge"}
            color={colors.primary}
            colors={colors}
            onPress={() => {
              if (user?.is_agent) {
                navigation.navigate("AgentProfile", { agentId: user.id });
              } else {
                navigation.navigate("BecomeAgent");
              }
            }}
          />
          {user?.is_admin && (
            <>
              <Action
                emoji="🛡" label="Admin: Listings" desc="Approve properties"
                color={colors.primaryDark}
                colors={colors}
                onPress={() => navigation.navigate("AdminPending")}
              />
              <Action
                emoji="🪪" label="Admin: Users" desc="Verify IDs"
                color={colors.primaryDark}
                colors={colors}
                onPress={() => navigation.navigate("AdminPendingUsers")}
              />
              <Action
                emoji="👔" label="Admin: Agents" desc="Approve agents"
                color={colors.primaryDark}
                colors={colors}
                onPress={() => navigation.navigate("AdminPendingAgents")}
              />
            </>
          )}
        </View>

        {/* Account info */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Account</Text>
          <Row label="Email" value={user?.email} colors={colors} />
          <Row label="Name" value={user?.name || "—"} colors={colors} />
          <Row label="User ID" value={`#${user?.id}`} colors={colors} />
          <Row
            label="Member since"
            value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Recently"}
            colors={colors}
            last
          />
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.danger }]}
          onPress={logout}
          activeOpacity={0.85}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Action({ emoji, label, desc, color, colors, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.tileIcon, { backgroundColor: color + "20" }]}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
      </View>
      <Text style={[styles.tileLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.tileDesc, { color: colors.textSecondary }]}>{desc}</Text>
    </TouchableOpacity>
  );
}

function Row({ label, value, colors, last }) {
  return (
    <View style={[styles.row, !last && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
      <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingTop: spacing.xl, paddingBottom: spacing.xxl, alignItems: "center",
    borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl,
  },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: { color: "#fff", fontSize: 36, fontWeight: "800" },
  name: { color: "#fff", fontSize: 22, fontWeight: "800" },
  email: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 2 },

  grid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg,
    gap: spacing.md,
  },
  tile: {
    width: "47.5%",
    borderRadius: radius.lg, borderWidth: 1, padding: spacing.md,
    elevation: 1,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  tileIcon: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.sm,
  },
  tileLabel: { fontSize: 14, fontWeight: "800" },
  tileDesc: { fontSize: 11, marginTop: 2 },

  card: {
    margin: spacing.lg, padding: spacing.lg,
    borderRadius: radius.xl, borderWidth: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", marginBottom: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm },
  rowLabel: { fontSize: 13, fontWeight: "600" },
  rowValue: { fontSize: 13, fontWeight: "700" },

  logoutBtn: {
    marginHorizontal: spacing.lg, marginTop: spacing.md,
    paddingVertical: 14, borderRadius: radius.lg, alignItems: "center",
  },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  verifyCard: {
    flexDirection: "row", alignItems: "center",
    margin: spacing.lg, marginBottom: 0,
    padding: spacing.md,
    borderRadius: radius.lg, borderWidth: 1,
  },
});
