// ============================================
// PROPERTY CARD (with favorite heart)
// ============================================

import { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, useColorScheme } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getColors, spacing, radius } from "../theme/colors";
import { formatRWF, formatRWFRent } from "../utils/format";
import { isFavorite, toggleFavorite } from "../utils/favorites";
import AgentBadge from "./AgentBadge";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800";

export default function PropertyCard({ property, onPress, hideFavorite = false }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const navigation = useNavigation();

  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isFavorite(property.id).then((v) => { if (!cancelled) setFavorited(v); });
    return () => { cancelled = true; };
  }, [property.id]);

  const isLand = property.property_type === "land";
  const priceText = property.type === "rent"
    ? formatRWFRent(property.price)
    : formatRWF(property.price, { compact: true });

  const badgeColor = property.type === "rent"
    ? colors.accent
    : isLand ? colors.accentLand : colors.primary;

  const badgeLabel = isLand ? "Land" : `For ${property.type}`;

  async function handleHeartPress(e) {
    e.stopPropagation?.();
    const newState = await toggleFavorite(property);
    setFavorited(newState);
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: property.image || FALLBACK_IMG }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Type badge */}
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{badgeLabel.toUpperCase()}</Text>
        </View>

        {/* Property type badge */}
        {!isLand && property.property_type && (
          <View style={[styles.typeBadge, { backgroundColor: "rgba(255,255,255,0.92)" }]}>
            <Text style={[styles.typeBadgeText, { color: colors.text }]}>
              {property.property_type}
            </Text>
          </View>
        )}

        {/* Agent badge (pill in top-center of image) */}
        {property.owner_is_agent && (
          <View style={styles.agentPill}>
            <AgentBadge size={12} showLabel label="Agent" />
          </View>
        )}

        {/* Heart button */}
        {!hideFavorite && (
          <TouchableOpacity
            onPress={handleHeartPress}
            style={styles.heartBtn}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 22 }}>{favorited ? "❤️" : "🤍"}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.body}>
        <Text style={[styles.price, { color: colors.text }]}>{priceText}</Text>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {property.title}
        </Text>
        <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1}>
          📍 {property.sector}
          {property.district && property.district !== property.sector && `, ${property.district}`}
        </Text>

        <View style={[styles.specs, { borderTopColor: colors.border }]}>
          {isLand ? (
            <>
              {property.land_size && (
                <Text style={[styles.spec, { color: colors.textSecondary }]}>📐 {property.land_size.toLocaleString()} sqm</Text>
              )}
              {property.road_access && (
                <Text style={[styles.spec, {
                  color: property.road_access === "paved" ? colors.success : colors.warning
                }]}>🛣 {property.road_access}</Text>
              )}
            </>
          ) : (
            <>
              {property.bedrooms != null && (
                <Text style={[styles.spec, { color: colors.textSecondary }]}>🛏 {property.bedrooms} bd</Text>
              )}
              {property.bathrooms != null && (
                <Text style={[styles.spec, { color: colors.textSecondary }]}>🛁 {property.bathrooms} ba</Text>
              )}
              {property.size_sqft != null && (
                <Text style={[styles.spec, { color: colors.textSecondary }]}>📐 {property.size_sqft.toLocaleString()} sqft</Text>
              )}
            </>
          )}
        </View>

        {/* Agent attribution (tap to open profile) */}
        {property.owner_is_agent && property.user_id && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              navigation.navigate("AgentProfile", { agentId: property.user_id });
            }}
            style={styles.agentRow}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>by </Text>
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>
              {property.owner_agency || "Verified Agent"}
            </Text>
            <AgentBadge size={12} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: spacing.lg,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  imageWrap: { position: "relative", height: 180 },
  image: { width: "100%", height: "100%" },
  badge: {
    position: "absolute", top: 12, left: 12,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 10, letterSpacing: 0.5 },
  typeBadge: {
    position: "absolute", top: 12, right: 12,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  typeBadgeText: { fontWeight: "700", fontSize: 11, textTransform: "capitalize" },
  agentPill: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  agentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  heartBtn: {
    position: "absolute", bottom: 12, right: 12,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center", justifyContent: "center",
    elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  body: { padding: spacing.lg },
  price: { fontSize: 22, fontWeight: "800", marginBottom: 2 },
  title: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  location: { fontSize: 13, marginBottom: spacing.md },
  specs: {
    flexDirection: "row", gap: spacing.md, flexWrap: "wrap",
    paddingTop: spacing.sm, borderTopWidth: 1,
  },
  spec: { fontSize: 12, fontWeight: "500" },
});
