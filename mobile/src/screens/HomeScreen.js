// ============================================
// HOME SCREEN
// ============================================
// Hero + featured properties from /properties

import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { listPropertiesApi } from "../api/properties";
import { getTrendsApi, getTrendingApi, getRecommendationsApi } from "../api/insights";
import PropertyCard from "../components/PropertyCard";
import HorizontalPropertyStrip from "../components/HorizontalPropertyStrip";
import MarketTrendsCard from "../components/MarketTrendsCard";
import { getColors, spacing, radius } from "../theme/colors";

export default function HomeScreen({ navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { user } = useAuth();

  const [properties, setProperties] = useState([]);
  const [trends, setTrends] = useState(null);
  const [trending, setTrending] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      // Featured = first 6
      const props = await listPropertiesApi();
      setProperties(props.slice(0, 6));

      // Insights run in parallel - failures here don't block the main feed
      setInsightsLoading(true);
      Promise.allSettled([
        getTrendsApi(),
        getTrendingApi({ days: 7, limit: 8 }),
        user ? getRecommendationsApi(8) : Promise.resolve({ properties: [] }),
      ]).then(([trendsRes, trendingRes, recsRes]) => {
        if (trendsRes.status === "fulfilled") setTrends(trendsRes.value);
        if (trendingRes.status === "fulfilled") setTrending(trendingRes.value.properties || []);
        if (recsRes.status === "fulfilled") setRecommendations(recsRes.value.properties || []);
        setInsightsLoading(false);
      });
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* HERO */}
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <Text style={styles.heroTag}>🇷🇼 KIGALI · RWANDA</Text>
          <Text style={styles.heroTitle}>
            Hello, {user?.name || user?.email?.split("@")[0]} 👋
          </Text>
          <Text style={styles.heroSubtitle}>
            Find your dream home or get an instant AI valuation.
          </Text>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.actionsRow}>
          <ActionTile
            emoji="🛒"
            label="Buy"
            color={colors.primary}
            onPress={() => navigation.getParent()?.navigate("Buy")}
          />
          <ActionTile
            emoji="🔑"
            label="Rent"
            color={colors.accent}
            onPress={() => navigation.getParent()?.navigate("Rent")}
          />
          <ActionTile
            emoji="🤖"
            label="AI"
            color={colors.warning}
            onPress={() => navigation.getParent()?.navigate("AI")}
          />
          <ActionTile
            emoji="👤"
            label="Profile"
            color={colors.textMuted}
            onPress={() => navigation.getParent()?.navigate("Profile")}
          />
        </View>

        {/* AI MARKET TRENDS */}
        <MarketTrendsCard trends={trends} loading={insightsLoading} />

        {/* RECOMMENDED FOR YOU */}
        {user && (
          <HorizontalPropertyStrip
            title="✨ For You"
            subtitle="Personalized AI recommendations"
            properties={recommendations}
            loading={insightsLoading}
            showMatchReason
            emptyMessage="View a few properties so we can learn your taste."
          />
        )}

        {/* TRENDING THIS WEEK */}
        <HorizontalPropertyStrip
          title="🔥 Trending"
          subtitle="Most viewed in the last 7 days"
          properties={trending}
          loading={insightsLoading}
          showViewCount
          emptyMessage="Nothing trending yet — be the first to browse!"
        />

        {/* FEATURED */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Properties</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Buy")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all →</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.textMuted, marginTop: spacing.md }}>Loading listings...</Text>
          </View>
        )}

        {error && !loading && (
          <View style={[styles.errorBox, { backgroundColor: colors.danger + "15", borderColor: colors.danger }]}>
            <Text style={{ color: colors.danger }}>⚠️ {error}</Text>
          </View>
        )}

        {!loading && !error && (
          <View style={{ paddingHorizontal: spacing.lg }}>
            {properties.map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                onPress={() => navigation.navigate("PropertyDetails", { propertyId: p.id })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionTile({ emoji, label, color, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tile, { backgroundColor: color + "1A" }]}>
      <Text style={styles.tileEmoji}>{emoji}</Text>
      <Text style={[styles.tileLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: spacing.xxl },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl + 20,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroTag: {
    color: "#fef9c3", fontSize: 11, fontWeight: "800",
    letterSpacing: 1.2, marginBottom: spacing.sm,
  },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  heroSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: spacing.xs },

  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    marginTop: -28,
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
  },
  tileEmoji: { fontSize: 24 },
  tileLabel: { fontSize: 11, fontWeight: "700", marginTop: 2 },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 20, fontWeight: "800" },
  seeAll: { fontSize: 13, fontWeight: "700" },

  center: { paddingVertical: spacing.xxl, alignItems: "center" },
  errorBox: {
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});

// Add horizontal padding to the property cards specifically
HomeScreen.style = styles;

// Wrap PropertyCard in a padded view inside the map
