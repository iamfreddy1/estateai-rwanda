// ============================================
// MARKET TRENDS CARD
// ============================================
// Compact card showing top-5 sectors by avg price + total active listings.
// Lives at the top of Home — instant insight into the Kigali market.

import { View, Text, StyleSheet, useColorScheme, ActivityIndicator } from "react-native";
import { getColors, spacing, radius } from "../theme/colors";
import { formatRWF } from "../utils/format";

export default function MarketTrendsCard({ trends, loading }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!trends) return null;

  const topSectors = (trends.avg_per_sector || []).slice(0, 5);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={{ fontSize: 22 }}>📊</Text>
        <View style={{ marginLeft: spacing.sm, flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Kigali Market</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            {trends.totals?.total_active_listings || 0} active listings
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <Text style={[styles.label, { color: colors.textMuted }]}>TOP SECTORS BY AVG PRICE</Text>
      {topSectors.length === 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>No data yet.</Text>
      ) : (
        topSectors.map((s, i) => (
          <View key={s.sector} style={styles.row}>
            <Text style={[styles.rank, { color: colors.primary }]}>#{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sector, { color: colors.text }]}>{s.sector}</Text>
              <Text style={[styles.district, { color: colors.textMuted }]}>{s.district} · {s.count} listings</Text>
            </View>
            <Text style={[styles.price, { color: colors.text }]}>
              {formatRWF(s.avg_price, { compact: true })}
            </Text>
          </View>
        ))
      )}

      {trends.top_growing_sectors && trends.top_growing_sectors.length > 0 && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border, marginTop: spacing.md }]} />
          <Text style={[styles.label, { color: colors.textMuted }]}>📈 GROWING THIS MONTH</Text>
          <View style={styles.chipsRow}>
            {trends.top_growing_sectors.slice(0, 3).map((g) => (
              <View key={g.sector} style={[styles.chip, { backgroundColor: colors.success + "20", borderColor: colors.success }]}>
                <Text style={{ color: colors.success, fontWeight: "700", fontSize: 12 }}>
                  {g.sector} (+{g.new_listings_30d})
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  title: { fontSize: 17, fontWeight: "800" },
  sub: { fontSize: 12, marginTop: 2 },
  divider: { height: 1, marginVertical: spacing.md },
  label: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5, marginBottom: spacing.sm },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  rank: { fontSize: 14, fontWeight: "800", width: 28 },
  sector: { fontSize: 14, fontWeight: "700" },
  district: { fontSize: 11, marginTop: 1 },
  price: { fontSize: 14, fontWeight: "800" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1,
  },
});
