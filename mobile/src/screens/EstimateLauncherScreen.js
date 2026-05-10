// ============================================
// ESTIMATE LAUNCHER SCREEN
// ============================================
// Lets the user pick House or Land estimation.

import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getColors, spacing, radius } from "../theme/colors";

export default function EstimateLauncherScreen({ navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <Text style={styles.tag}>🤖 AI POWERED</Text>
        <Text style={styles.title}>AI Property Valuation</Text>
        <Text style={styles.subtitle}>
          Random Forest models trained on Kigali real estate data
        </Text>
      </View>

      {/* Two big cards */}
      <View style={styles.cards}>
        <BigCard
          emoji="🏠"
          title="House Estimate"
          desc="Bedrooms, sqft, sector, finishes — get a price in seconds."
          color={colors.primary}
          onPress={() => navigation.navigate("EstimateHouse")}
        />
        <BigCard
          emoji="🌳"
          title="Land Estimate"
          desc="Plot size, road access, slope, title deed — instant valuation."
          color={colors.accent}
          onPress={() => navigation.navigate("EstimateLand")}
        />
      </View>

      <View style={[styles.tipBox, { backgroundColor: colors.warning + "15", borderColor: colors.warning }]}>
        <Text style={{ fontSize: 13, color: colors.text, fontWeight: "600" }}>💡 Tip</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 18 }}>
          Properties in <Text style={{ fontWeight: "800" }}>Nyarutarama</Text> and{" "}
          <Text style={{ fontWeight: "800" }}>Kimihurura</Text> command premium prices.
          Modern finishes and paved access typically add ~10% each.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function BigCard({ emoji, title, desc, color, onPress }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.cardIcon, { backgroundColor: color + "1A" }]}>
        <Text style={{ fontSize: 36 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{desc}</Text>
      </View>
      <Text style={[styles.arrow, { color }]}>→</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  tag: { color: "#fef9c3", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800", marginTop: spacing.xs },
  subtitle: { color: "rgba(255,255,255,0.9)", fontSize: 14, marginTop: spacing.xs },

  cards: { padding: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: "row", alignItems: "center",
    padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1,
    elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  cardIcon: {
    width: 60, height: 60, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 17, fontWeight: "800" },
  cardDesc: { fontSize: 13, marginTop: 2 },
  arrow: { fontSize: 24, fontWeight: "800" },

  tipBox: {
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
