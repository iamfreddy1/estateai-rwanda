// ============================================
// PROPERTY DETAILS SCREEN
// ============================================
// Full-screen property view: hero image, specs, location, owner.
// Receives `propertyId` via route params.

import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Image, TouchableOpacity, StyleSheet,
  ActivityIndicator, useColorScheme, Alert, Linking, FlatList, Dimensions,
  Share, Clipboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getPropertyApi, deletePropertyApi, getSimilarPropertiesApi } from "../api/properties";
import { startConversationApi } from "../api/chat";
import { trackViewApi } from "../api/insights";
import RentalCard from "../components/RentalCard";
import { inquireRental } from "../api/rentals";
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
  const [similarItems, setSimilarItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPropertyApi(propertyId)
      .then((p) => { if (!cancelled) setProperty(p); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    // Track this view in the background (powers trending + recommendations)
    trackViewApi(propertyId);
    getSimilarPropertiesApi(propertyId).then(setSimilarItems).catch(() => {});

    return () => { cancelled = true; };
  }, [propertyId]);


  const screenWidth = Dimensions.get("window").width;
  const heroImages = (property?.images && property.images.length > 0)
    ? property.images
    : (property?.image ? [property.image] : [FALLBACK_IMG]);
  const [heroIdx, setHeroIdx] = useState(0);
  function renderHero() {
    if (heroImages.length <= 1) {
      return (
        <Image source={{ uri: heroImages[0] }} style={styles.heroImage} resizeMode="cover" />
      );
    }
    return (
      <View>
        <FlatList
          data={heroImages}
          keyExtractor={(_, i) => String(i)}
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => setHeroIdx(Math.round(e.nativeEvent.contentOffset.x / screenWidth))}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={[styles.heroImage, { width: screenWidth }]} resizeMode="cover" />
          )}
        />
        <View style={{ position: "absolute", bottom: 10, left: 0, right: 0,
                       flexDirection: "row", justifyContent: "center" }}>
          {heroImages.map((_, i) => (
            <View key={i} style={{ width: i === heroIdx ? 18 : 6, height: 6, borderRadius: 3,
              backgroundColor: i === heroIdx ? "#fff" : "rgba(255,255,255,0.55)", marginHorizontal: 3 }} />
          ))}
        </View>
        <View style={{ position: "absolute", top: 12, right: 12,
                       backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 8, paddingVertical: 4,
                       borderRadius: 12 }}>
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
            {heroIdx + 1} / {heroImages.length}
          </Text>
        </View>
      </View>
    );
  }

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


  async function handleRequestViewing() {
    if (!user) {
      Alert.alert("Login required", "Please log in to request a viewing.");
      return;
    }
    if (!property || property.user_id === user.id) return;
    try {
      await inquireRental(property.id, {
        kind: "viewing",
        message: "I'd like to visit this property. When is a good time?",
      });
      Alert.alert("Request sent", "The landlord has been notified of your viewing request.");
    } catch (err) {
      Alert.alert("Could not send request", err.message);
    }
  }

  async function handleCallLandlord() {
    // Direct dial — no paywall. Use the seller's actual phone number.
    const phone = property?.owner_phone;
    if (!phone) {
      Alert.alert(
        "No phone number",
        "The seller has not added a phone number to their profile yet."
      );
      return;
    }
    // Log the call as an inquiry only for rentals + non-owners (fire-and-forget).
    if (user && property.user_id !== user.id && property.type === "rent") {
      inquireRental(property.id, {
        kind: "call",
        message: "Tapped Call from the listing page.",
      }).catch(() => {});
    }
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert("Couldn't open dialer", "Try copying the number: " + phone)
    );
  }

  // ------- WhatsApp ---------------------------------------------------------
  // Tries the native deep link first (whatsapp://); if WhatsApp isn't installed
  // it falls back to the wa.me web URL which opens in the browser / store.
  async function handleWhatsApp() {
    const phone = property?.owner_phone;
    if (!phone) {
      Alert.alert("No phone number", "Seller has not added a phone number.");
      return;
    }
    const digits = String(phone).replace(/\D/g, "");
    const msisdn = digits.startsWith("250") ? digits
                : digits.startsWith("0") ? "250" + digits.slice(1)
                : digits;
    const msg = encodeURIComponent(
      `Hi! I'm interested in your property "${property.title}" on EstateAI Rwanda.`
    );
    const native = `whatsapp://send?phone=${msisdn}&text=${msg}`;
    const web    = `https://wa.me/${msisdn}?text=${msg}`;
    try {
      const ok = await Linking.canOpenURL(native);
      Linking.openURL(ok ? native : web);
    } catch {
      Linking.openURL(web).catch(() =>
        Alert.alert("Couldn't open WhatsApp", `Send a message to: ${phone}`)
      );
    }
  }

  // ------- Clipboard helpers ------------------------------------------------
  function copyToClipboard(text) {
    try { Clipboard.setString(String(text || "")); } catch {}
    Alert.alert("Copied", "Copied to clipboard");
  }

  function copyAllPaymentDetails(pay) {
    const lines = [`Property: ${property.title}`,
                   `Account Name: ${pay.account_holder_name || "-"}`];
    if ((pay.methods || []).includes("mtn") && pay.mtn_number)
      lines.push(`MTN Mobile Money: ${pay.mtn_number}`);
    if ((pay.methods || []).includes("airtel") && pay.airtel_number)
      lines.push(`Airtel Money: ${pay.airtel_number}`);
    if ((pay.methods || []).includes("bk") && pay.bk_account_number)
      lines.push(`Bank of Kigali: ${pay.bk_account_number}`);
    if ((pay.methods || []).includes("equity") && pay.equity_account_number)
      lines.push(`Equity Bank: ${pay.equity_account_number}`);
    const text = lines.join("\n");
    try { Clipboard.setString(text); } catch {}
    Alert.alert("Copied", "All payment details copied to clipboard");
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
          {renderHero()}
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
          {user && property.user_id === user.id && (
            <TouchableOpacity
              onPress={() => navigation.navigate("EditListing", { propertyId: property.id })}
              style={{ marginBottom: 10, padding: 12, borderRadius: 10,
                       borderColor: colors.primary, borderWidth: 1, alignItems: "center" }}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>✏️ Edit listing</Text>
            </TouchableOpacity>
          )}

          {/* Seller phone — always visible (direct calling, no paywall) */}
          {property.owner_phone && property.user_id !== user?.id && (
            <View style={{ marginBottom: 10, padding: 12, borderRadius: 10,
                           backgroundColor: "#ecfdf5", borderColor: "#10b981",
                           borderWidth: 1 }}>
              <Text style={{ color: "#065f46", fontWeight: "700" }}>
                📞 {property.owner_phone}
              </Text>
              <Text style={{ color: "#065f46", fontSize: 12, marginTop: 2 }}>
                Tap Call below to dial directly
              </Text>
            </View>
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
              <Text style={styles.buttonText}>
                {property.type === "rent" ? "💬 Chat with Landlord" : "💬 Contact Seller"}
              </Text>
            )}
          </TouchableOpacity>
          {/* Call (always) + Request viewing (rentals only) for non-owners */}
          {user && property.user_id !== user?.id && (
            <View style={{ flexDirection: "row", marginTop: 10, gap: 8 }}>
              {property.type === "rent" && (
                <TouchableOpacity
                  onPress={handleRequestViewing}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: radius.md,
                           backgroundColor: "#10b981", alignItems: "center" }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>👁 Request viewing</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleCallLandlord}
                style={{ flex: 1, paddingVertical: 12, borderRadius: radius.md,
                         backgroundColor: "#f59e0b", alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {property.type === "rent" ? "📞 Call" : "📞 Call seller"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleWhatsApp}
                style={{ flex: 1, paddingVertical: 12, borderRadius: radius.md,
                         backgroundColor: "#25d366", alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>💬 WhatsApp</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ============ PAYMENT INFORMATION ============ */}
        {(() => {
          const pay = property.payment || {};
          const methods = pay.methods || [];
          const isOwner = user && property.user_id === user.id;
          if (pay.flagged && !isOwner) {
            return (
              <View style={[styles.card, { backgroundColor: "#fee2e2", borderColor: "#dc2626",
                                            marginBottom: spacing.xxl }]}>
                <Text style={{ color: "#b91c1c", fontWeight: "700" }}>
                  Payment details disabled
                </Text>
                <Text style={{ color: "#b91c1c", marginTop: 4, fontSize: 13 }}>
                  An admin has disabled this listing's payment information. Contact the seller directly.
                </Text>
              </View>
            );
          }
          if (!methods.length || pay.show_payment_details === false) {
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border,
                                            marginBottom: spacing.xxl }]}>
                <Text style={[styles.label, { color: colors.textMuted }]}>PAYMENT INFORMATION</Text>
                <Text style={{ color: colors.textMuted, fontStyle: "italic", marginTop: 4 }}>
                  The seller has not published payment details. Contact them to arrange payment.
                </Text>
              </View>
            );
          }
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border,
                                          marginBottom: spacing.xxl }]}>
              <Text style={[styles.label, { color: colors.textMuted }]}>PAYMENT INFORMATION</Text>
              {pay.account_holder_name && (
                <PaymentRow colors={colors} icon="👤" label="Account Name"
                            value={pay.account_holder_name} onCopy={copyToClipboard} />
              )}
              {methods.includes("mtn") && pay.mtn_number && (
                <PaymentRow colors={colors} icon="🟡" label="MTN Mobile Money"
                            value={pay.mtn_number} onCopy={copyToClipboard} />
              )}
              {methods.includes("airtel") && pay.airtel_number && (
                <PaymentRow colors={colors} icon="🔴" label="Airtel Money"
                            value={pay.airtel_number} onCopy={copyToClipboard} />
              )}
              {methods.includes("bk") && pay.bk_account_number && (
                <PaymentRow colors={colors} icon="🏦" label="Bank of Kigali"
                            value={pay.bk_account_number} onCopy={copyToClipboard} />
              )}
              {methods.includes("equity") && pay.equity_account_number && (
                <PaymentRow colors={colors} icon="🏦" label="Equity Bank Rwanda"
                            value={pay.equity_account_number} onCopy={copyToClipboard} />
              )}
              <TouchableOpacity
                onPress={() => copyAllPaymentDetails(pay)}
                style={{ marginTop: 12, paddingVertical: 12, borderRadius: radius.md,
                         backgroundColor: colors.primary, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>📋 Copy All Payment Details</Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {similarItems.length > 0 && (
          <View style={{ marginTop: 8, marginBottom: 24 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800", marginLeft: 16, marginBottom: 6 }}>
              Similar properties
            </Text>
            {similarItems.map(p => (
              <RentalCard
                key={p.id}
                rental={p}
                onPress={() => navigation.push("PropertyDetails", { propertyId: p.id })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function PaymentRow({ colors, icon, label, value, onCopy }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10,
                   borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ fontSize: 18, marginRight: 8 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.3 }}>
          {label.toUpperCase()}
        </Text>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 2 }}>
          {value}
        </Text>
      </View>
      <TouchableOpacity onPress={() => onCopy(value)}
        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                 borderWidth: 1, borderColor: colors.primary }}>
        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>COPY</Text>
      </TouchableOpacity>
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

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  heroImage: { width: "100%", height: 280 },
  body: { padding: 16 },
  title: { fontSize: 22, fontWeight: "800" },
  price: { fontSize: 24, fontWeight: "800", marginTop: 4 },
  sub: { fontSize: 14, marginTop: 4 },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 12 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  ownerName: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  coords: { fontSize: 12, marginTop: 4 },
  specGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  specItem: { flexDirection: "row", alignItems: "center", width: "50%",
              paddingVertical: 8 },
  contactBtn: { padding: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
