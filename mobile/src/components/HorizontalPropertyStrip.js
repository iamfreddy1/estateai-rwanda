// ============================================
// HORIZONTAL PROPERTY STRIP
// ============================================
// Compact, horizontally-scrollable list of property cards.
// Used by Home for "Recommended" and "Trending" sections.

import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  ScrollView, useColorScheme, ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import { getColors, spacing, radius } from "../theme/colors";
import { formatRWF, formatRWFRent } from "../utils/format";
import AgentBadge from "./AgentBadge";

const FALLBACK = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400";

export default function HorizontalPropertyStrip({
  title,
  subtitle,
  properties,
  loading,
  emptyMessage,
  showMatchReason = false,
  showViewCount = false,
}) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const navigation = useNavigation();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ paddingVertical: spacing.lg, alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !properties || properties.length === 0 ? (
        <View style={{ paddingVertical: spacing.lg, paddingHorizontal: spacing.lg }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {emptyMessage || "Nothing here yet."}
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        >
          {properties.map((p) => (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("PropertyDetails", { propertyId: p.id })}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Image
                source={{ uri: p.image || FALLBACK }}
                style={styles.image}
                resizeMode="cover"
              />
              {p.owner_is_agent && (
                <View style={styles.agentPill}>
                  <AgentBadge size={11} />
                </View>
              )}
              {showViewCount && p.view_count != null && (
                <View style={styles.viewBadge}>
                  <Text style={styles.viewBadgeText}>👀 {p.view_count}</Text>
                </View>
              )}

              <View style={{ padding: spacing.sm }}>
                <Text style={[styles.price, { color: colors.text }]} numberOfLines={1}>
                  {p.type === "rent"
                    ? formatRWFRent(p.price)
                    : formatRWF(p.price, { compact: true })}
                </Text>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                  {p.title}
                </Text>
                <Text style={[styles.loc, { color: colors.textSecondary }]} numberOfLines={1}>
                  📍 {p.sector}
                </Text>
                {showMatchReason && p.match_reason && (
                  <Text style={[styles.reason, { color: colors.primary }]} numberOfLines={1}>
                    ✨ {p.match_reason}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 2 },

  card: {
    width: 200,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    marginRight: spacing.md,
    elevation: 1,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  image: { width: "100%", height: 110 },
  agentPill: {
    position: "absolute", top: 8, right: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 4, paddingVertical: 2, borderRadius: 999,
  },
  viewBadge: {
    position: "absolute", top: 8, left: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  viewBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  price: { fontSize: 15, fontWeight: "800" },
  cardTitle: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  loc: { fontSize: 11, marginTop: 2 },
  reason: { fontSize: 10, fontWeight: "700", marginTop: 4 },
});
