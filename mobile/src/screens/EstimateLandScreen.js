// ============================================
// AI LAND ESTIMATE SCREEN
// ============================================

import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, useColorScheme, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FormField from "../components/FormField";
import ChipPicker from "../components/ChipPicker";
import AnimatedNumber from "../components/AnimatedNumber";
import ConfidenceBar from "../components/ConfidenceBar";
import {
  DISTRICTS, SECTORS_BY_DISTRICT, ROAD_ACCESS, SLOPES,
} from "../constants/locations";
import { predictLandApi } from "../api/predictions";
import { formatRWF } from "../utils/format";
import { getColors, spacing, radius } from "../theme/colors";


export default function EstimateLandScreen({ navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const [district, setDistrict] = useState("Gasabo");
  const [sector, setSector] = useState("Kacyiru");
  const [landSize, setLandSize] = useState("800");
  const [roadAccess, setRoadAccess] = useState("paved");
  const [proximityToCity, setProximityToCity] = useState("5");
  const [proximityToRoad, setProximityToRoad] = useState("50");
  const [slope, setSlope] = useState("flat");
  const [utilities, setUtilities] = useState(true);
  const [titleDeed, setTitleDeed] = useState(true);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const sectorsForDistrict = SECTORS_BY_DISTRICT[district] || [];

  async function handleEstimate() {
    setLoading(true);
    setResult(null);
    try {
      const data = await predictLandApi({
        district, sector,
        land_size: Number(landSize),
        road_access: roadAccess,
        proximity_to_city: Number(proximityToCity),
        proximity_to_road: Number(proximityToRoad),
        slope,
        utilities: utilities ? 1 : 0,
        title_deed: titleDeed ? 1 : 0,
      });
      setResult(data);
    } catch (err) {
      Alert.alert("Estimation failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">

        <View style={[styles.hero, { backgroundColor: colors.accent }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backTxt}>←</Text>
          </TouchableOpacity>
          <Text style={styles.heroTag}>🤖 AI POWERED</Text>
          <Text style={styles.heroTitle}>Land Price Estimator 🌳</Text>
          <Text style={styles.heroSub}>Slope, road access, and title deed all matter</Text>
        </View>

        {/* RESULT */}
        {(loading || result) && (
          <View style={[styles.resultCard, {
            backgroundColor: colors.card, borderColor: colors.border, borderTopColor: colors.accent,
          }]}>
            {loading ? (
              <View style={{ alignItems: "center", paddingVertical: spacing.lg }}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={{ color: colors.textMuted, marginTop: spacing.md }}>
                  AI is calculating...
                </Text>
              </View>
            ) : result && (
              <>
                <Text style={[styles.resultLabel, { color: colors.textMuted }]}>💰 ESTIMATED VALUE</Text>
                <AnimatedNumber
                  value={result.predicted_price}
                  format={(n) => formatRWF(n, { compact: true })}
                  style={[styles.priceLg, { color: colors.accent }]}
                />
                <Text style={[styles.priceFull, { color: colors.textSecondary }]}>
                  ≈ {formatRWF(result.predicted_price)}
                </Text>

                {result.price_per_sqm && (
                  <View style={[styles.perSqm, { backgroundColor: colors.accent + "1A", borderColor: colors.accent + "60" }]}>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: colors.accent }}>
                      📏 {formatRWF(result.price_per_sqm, { compact: true }).replace(" RWF", "")} / sqm
                    </Text>
                  </View>
                )}

                <View style={{ marginTop: spacing.md }}>
                  <ConfidenceBar confidence={result.confidence} />
                </View>

                <View style={[styles.explainBox, { backgroundColor: colors.accent + "10", borderColor: colors.accent + "40" }]}>
                  <Text style={[styles.explainLabel, { color: colors.accent }]}>📝 RATIONALE</Text>
                  <Text style={[styles.explainText, { color: colors.text }]}>{result.explanation}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* FORM */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.section, { color: colors.text }]}>📍 Location</Text>
          <ChipPicker label="District" options={DISTRICTS}
            value={district}
            onChange={(d) => { setDistrict(d); setSector(SECTORS_BY_DISTRICT[d][0]); }}
            themeColor={colors.accent}
          />
          <ChipPicker label="Sector" options={sectorsForDistrict}
            value={sector} onChange={setSector} themeColor={colors.accent}
          />

          <Text style={[styles.section, { color: colors.text, marginTop: spacing.md }]}>📐 Plot</Text>
          <FormField label="Land size (sqm)" value={landSize} onChangeText={setLandSize} keyboardType="numeric" />
          <ChipPicker label="Slope / Terrain" options={SLOPES}
            value={slope} onChange={setSlope} themeColor={colors.accent}
          />

          <Text style={[styles.section, { color: colors.text, marginTop: spacing.md }]}>🛣 Access</Text>
          <ChipPicker label="Road access" options={ROAD_ACCESS}
            value={roadAccess} onChange={setRoadAccess} themeColor={colors.accent}
          />
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <FormField label="Distance to road (m)" value={proximityToRoad} onChangeText={setProximityToRoad} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Distance to city (km)" value={proximityToCity} onChangeText={setProximityToCity} keyboardType="numeric" />
            </View>
          </View>

          {/* Toggles */}
          <Text style={[styles.section, { color: colors.text, marginTop: spacing.md }]}>✨ Status</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <ToggleCard label="⚡ Utilities" active={utilities} onPress={() => setUtilities(!utilities)} colors={colors} />
            <ToggleCard label="📜 Title deed" active={titleDeed} onPress={() => setTitleDeed(!titleDeed)} colors={colors} />
          </View>

          <TouchableOpacity
            onPress={handleEstimate}
            disabled={loading}
            style={[styles.submit, { backgroundColor: loading ? colors.textMuted : colors.accent }]}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.submitText}>Estimate Land Price 🚀</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleCard({ label, active, onPress, colors }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        flex: 1,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        backgroundColor: active ? colors.accent + "1A" : colors.background,
        borderColor: active ? colors.accent : colors.border,
        alignItems: "center",
      }}
    >
      <Text style={{
        color: active ? colors.accent : colors.text,
        fontWeight: "700",
      }}>
        {active ? "✓ " : ""}{label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  backBtn: {
    position: "absolute", top: spacing.md, left: spacing.md,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center",
  },
  backTxt: { color: "#fff", fontSize: 22, fontWeight: "800" },
  heroTag: { color: "#fef9c3", fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginTop: 24 },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 4 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 4 },

  resultCard: {
    margin: spacing.lg, padding: spacing.lg,
    borderRadius: radius.xl, borderWidth: 1, borderTopWidth: 4,
    elevation: 3,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  resultLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  priceLg: { fontSize: 40, fontWeight: "900", marginTop: 4 },
  priceFull: { fontSize: 13, marginTop: 2 },
  perSqm: {
    alignSelf: "flex-start",
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, marginTop: spacing.md,
  },
  explainBox: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md, marginTop: spacing.md },
  explainLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5, marginBottom: 4 },
  explainText: { fontSize: 13, lineHeight: 18 },

  card: {
    margin: spacing.lg, padding: spacing.lg,
    borderRadius: radius.xl, borderWidth: 1,
    elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  section: { fontSize: 13, fontWeight: "800", letterSpacing: 0.3, marginBottom: spacing.sm },
  submit: { marginTop: spacing.lg, paddingVertical: 14, borderRadius: radius.lg, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
