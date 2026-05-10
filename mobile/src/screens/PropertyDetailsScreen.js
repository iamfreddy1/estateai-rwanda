// ============================================
// PROPERTY DETAILS SCREEN
// ============================================
// Full-screen property view: hero image, specs, location, owner.
// Receives `propertyId` via route params.

import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Image, TouchableOpacity, StyleSheet,
  ActivityIndicator, useColorScheme, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getPropertyApi, deletePropertyApi } from "../api/properties";
import { startConversationApi } from "../api/chat";
import { trackViewApi } from "../api/insights";
import { useAuth } from "../context/AuthContext";
import { getColors, spacing, radius } from "../theme/colors";
import { formatRWF, formatRWFRent } from "../utils/format";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200";

export default function PropertyDetailsScreen({ route, navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { user } = useAuth();
  const { propertyId } = route.params;

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contacting, setContacting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPropertyApi(propertyId)
      .then((p) => { if (!cancelled) setProperty(p); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    // Track this view in the background (powers trending + recommendations)
    trackViewApi(propertyId);

    return () => { cancelled = true; };
  }, [propertyId]);

  async function handleContactSeller() {
    if (!user) {
      Alert.alert("Login required", "Please log in to message the seller.");
      return;
    }
    if (!property) return;
    if (property.user_id === user.id) {
      Alert.alert("That's your listing", "You can't message yourself.");
      return;
    }
    if (!property.user_id) {
      Alert.alert("No seller", "This is a featured listing without a seller account.");
      return;
    }

    setContacting(true);
    try {
      const convo = await startConversationApi(property.id);
      // Navigate to chat using the parent navigator (Messages tab) so the user
      // ends up in a stack that has the ConversationsList screen behind it.
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
    } finally {
      setContacting(false);
    }
  }

  async function handleDelete() {
    Alert.alert(
      "Delete Listing",
      `Delete "${property.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePropertyApi(property.id);
              navigation.goBack();
            } catch (err) {
              Alert.alert("Error", err.message);
            }
          }
        }
      ]
    );
  }

  // ---- LOADING ----
  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  // ---- ERROR ----
  if (error || !property) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 56 }}>😕</Text>
        <Text style={[styles.errTitle, { color: colors.text }]}>Property not found</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{error || "Listing may have been removed"}</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary, marginTop: spacing.xl }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isLand = property.property_type === "land";
  const isOwner = user && property.user_id === user.id;
  const priceText = property.type === "rent"
    ? formatRWFRent(property.price)
    : formatRWF(property.price, { compact: true });

  const badgeColor = property.type === "rent"
    ? colors.accent
    : isLand ? colors.accentLand : colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* HERO IMAGE */}
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: property.image || FALLBACK_IMG }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          {/* Back button */}
          <SafeAreaView style={styles.backWrap} edges={["top"]}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
          </SafeAreaView>

          {/* Type badge */}
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>
              {(isLand ? "Land" : `For ${property.type}`).toUpperCase()}
            </Text>
          </View>

          {/* Title overlay */}
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle} numberOfLines={2}>{property.title}</Text>
            <Text style={styles.heroLoc}>📍 {property.sector}, {property.district}</Text>
          </View>
        </View>

        {/* PRICE CARD */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.priceLabel, { color: colors.textMuted }]}>PRICE</Text>
          <Text style={[styles.priceLg, { color: colors.primary }]}>{priceText}</Text>
          <Text style={[styles.priceFull, { color: colors.textSecondary }]}>
            ≈ {formatRWF(property.price)}
          </Text>

          {isOwner && (
            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: colors.danger }]}
              onPress={handleDelete}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>🗑️ Delete Listing</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* FEATURES */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Property Features</Text>
          <View style={styles.specsGrid}>
            {!isLand && (
              <>
                {property.bedrooms != null  && <Spec colors={colors} icon="🛏" label="Bedrooms"  value={property.bedrooms} />}
                {property.bathrooms != null && <Spec colors={colors} icon="🛁" label="Bathrooms" value={property.bathrooms} />}
                {property.size_sqft != null && <Spec colors={colors} icon="📐" label="Size"      value={`${property.size_sqft.toLocaleString()} sqft`} />}
                {property.year_built       && <Spec colors={colors} icon="📅" label="Year"       value={property.year_built} />}
                {property.parking != null   && <Spec colors={colors} icon="🚗" label="Parking"   value={`${property.parking} spots`} />}
                {property.furnished != null && <Spec colors={colors} icon="🛋" label="Furnished" value={property.furnished ? "Yes" : "No"} />}
              </>
            )}
            {property.land_size       && <Spec colors={colors} icon="🌳" label="Plot"      value={`${property.land_size.toLocaleString()} sqm`} />}
            {property.road_access     && <Spec colors={colors} icon="🛣"  label="Road"      value={property.road_access} />}
            {property.proximity_to_city != null && <Spec colors={colors} icon="📍" label="To city" value={`${property.proximity_to_city} km`} />}
            {property.property_type   && <Spec colors={colors} icon="🏘"  label="Type"      value={property.property_type} />}
          </View>

          {/* Tags */}
          <View style={styles.tags}>
            {property.modern_finish && <Tag color={colors.accent} text="✨ Modern finish" />}
            {property.furnished     && <Tag color={colors.primary} text="🛋 Furnished" />}
            {property.road_access === "paved" && <Tag color={colors.success} text="🛣 Paved access" />}
          </View>
        </View>

        {/* LOCATION */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📍 Location</Text>
          <Text style={[styles.locationText, { color: colors.textSecondary }]}>
            {property.sector}, {property.district} District, Kigali, Rwanda
          </Text>
          {property.latitude && property.longitude ? (
            <Text style={[styles.coords, { color: colors.textMuted }]}>
              GPS: {property.latitude.toFixed(4)}, {property.longitude.toFixed(4)}
            </Text>
          ) : null}
          <Text style={[styles.coords, { color: colors.textMuted, fontStyle: "italic" }]}>
            Map view coming in M7
          </Text>
        </View>

        {/* OWNER */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: spacing.xxl }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>LISTED BY</Text>
          <Text style={[styles.ownerName, { color: colors.text }]}>{property.owner_name || "EstateAI"}</Text>
          {property.created_at && (
            <Text style={[styles.coords, { color: colors.textMuted }]}>
              Posted {new Date(property.created_at).toLocaleDateString()}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.contactBtn, {
              backgroundColor: contacting ? colors.textMuted : colors.primary
            }]}
            activeOpacity={0.85}
            disabled={contacting}
            onPress={handleContactSeller}
          >
            {contacting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>💬 Contact Seller</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function Spec({ colors, icon, label, value }) {
  return (
    <View style={styles.specItem}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <View style={{ marginLeft: 8, flex: 1 }}>
        <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: "700", letterSpacing: 0.4 }}>
          {label.toUpperCase()}
        </Text>
        <Text style={{ fontSize: 14, color: colors.text, fontWeight: "600", textTransform: "capitalize" }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function Tag({ color, text }) {
  return (
    <View style={{ backgroundColor: color + "20", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginRight: 6, marginBottom: 6 }}>
      <Text style={{ color, fontSize: 11, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  errTitle: { fontSize: 22, fontWeight: "800", marginTop: spacing.md },
  heroWrap: { width: "100%", height: 320, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  backWrap: {
    position: "absolute", top: 0, left: 0,
  },
  backBtn: {
    margin: spacing.md, width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center", justifyContent: "center",
  },
  backText: { fontSize: 22, fontWeight: "800", color: "#111" },
  badge: {
    position: "absolute", top: 16, right: 16,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 11, letterSpacing: 0.5 },
  heroOverlay: {
    position: "absolute", left: 16, right: 16, bottom: 16,
  },
  heroTitle: {
    color: "#fff", fontSize: 26, fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 },
  },
  heroLoc: { color: "rgba(255,255,255,0.95)", fontSize: 14, marginTop: 4, fontWeight: "600" },

  card: {
    margin: spacing.lg, padding: spacing.lg,
    borderRadius: radius.xl, borderWidth: 1,
    elevation: 1,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  priceLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  priceLg: { fontSize: 36, fontWeight: "800", marginTop: 2 },
  priceFull: { fontSize: 13, marginTop: 2 },
  deleteBtn: {
    marginTop: spacing.lg, paddingVertical: 10, borderRadius: radius.md, alignItems: "center",
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: spacing.md },
  specsGrid: { flexDirection: "row", flexWrap: "wrap" },
  specItem: { width: "50%", flexDirection: "row", alignItems: "flex-start", paddingVertical: 8 },
  tags: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.md },
  locationText: { fontSize: 14 },
  coords: { fontSize: 12, marginTop: 4 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  ownerName: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  contactBtn: { marginTop: spacing.lg, paddingVertical: 14, borderRadius: radius.lg, alignItems: "center" },
  button: { paddingVertical: 12, paddingHorizontal: spacing.xl, borderRadius: radius.lg },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
