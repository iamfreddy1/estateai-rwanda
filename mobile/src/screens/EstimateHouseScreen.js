// ============================================
// AI HOUSE ESTIMATE SCREEN
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
  DISTRICTS, SECTORS_BY_DISTRICT, PROPERTY_TYPES_HOUSE, ROAD_ACCESS,
} from "../constants/locations";
import { predictHouseApi } from "../api/predictions";
import { formatRWF } from "../utils/format";
import { getColors, spacing, radius } from "../theme/colors";


export default function EstimateHouseScreen({ navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  // Form state
  const [district, setDistrict] = useState("Gasabo");
  const [sector, setSector] = useState("Kacyiru");
  const [propertyType, setPropertyType] = useState("house");
  const [bedrooms, setBedrooms] = useState("3");
  const [bathrooms, setBathrooms] = useState("2");
  const [sizeSqft, setSizeSqft] = useState("1800");
  const [landSize, setLandSize] = useState("500");
  const [yearBuilt, setYearBuilt] = useState("2020");
  const [roadAccess, setRoadAccess] = useState("paved");
  const [furnished, setFurnished] = useState(true);
  const [parking, setParking] = useState("2");
  const [modernFinish, setModernFinish] = useState(true);
  const [proximityToCity, setProximityToCity] = useState("5");

  // UI state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const sectorsForDistrict = SECTORS_BY_DISTRICT[district] || [];

  async function handleEstimate() {
    setLoading(true);
    setResult(null);
    try {
      const data = await predictHouseApi({
        district, sector,
        property_type: propertyType,
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        size_sqft: Number(sizeSqft),
        land_size: Number(landSize),
        year_built: Number(yearBuilt),
        road_access: roadAccess,
        furnished: furnished ? 1 : 0,
        parking: Number(parking),
        modern_finish: modernFinish ? 1 : 0,
        proximity_to_city: Number(proximityToCity),
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

        {/* Header */}
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backTxt}>←</Text>
          </TouchableOpacity>
          <Text style={styles.heroTag}>🤖 AI POWERED</Text>
          <Text style={styles.heroTitle}>House Price Estimator 🏠</Text>
          <Text style={styles.heroSub}>Enter property details for instant RWF valuation</Text>
        </View>

        {/* RESULT (above the form when present) */}
        {(loading || result) && (
          <View style={[styles.resultCard, {
            backgroundColor: colors.card, borderColor: colors.border, borderTopColor: colors.primary,
          }]}>
            {loading ? (
              <View style={{ alignItems: "center", paddingVertical: spacing.lg }}>
                <ActivityIndicator size="large" color={colors.primary} />
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
                  style={[styles.priceLg, { color: colors.primary }]}
                />
                <Text style={[styles.priceFull, { color: colors.textSecondary }]}>
                  ≈ {formatRWF(result.predicted_price)}
                </Text>
                <View style={{ marginTop: spacing.md }}>
                  <ConfidenceBar confidence={result.confidence} />
                </View>
                <View style={[styles.explainBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "40" }]}>
                  <Text style={[styles.explainLabel, { color: colors.primary }]}>📝 RATIONALE</Text>
                  <Text style={[styles.explainText, { color: colors.text }]}>
                    {result.explanation}
                  </Text>
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
            themeColor={colors.primary}
          />
          <ChipPicker label="Sector" options={sectorsForDistrict}
            value={sector} onChange={setSector} themeColor={colors.primary}
          />

          <Text style={[styles.section, { color: colors.text, marginTop: spacing.md }]}>🏠 Property</Text>
          <ChipPicker label="Type" options={PROPERTY_TYPES_HOUSE}
            value={propertyType} onChange={setPropertyType} themeColor={colors.primary}
          />
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <FormField label="Year Built" value={yearBuilt} onChangeText={setYearBuilt} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Parking" value={parking} onChangeText={setParking} keyboardType="numeric" />
            </View>
          </View>

          <Text style={[styles.section, { color: colors.text, marginTop: spacing.md }]}>📐 Specs</Text>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <FormField label="Bedrooms" value={bedrooms} onChangeText={setBedrooms} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Bathrooms" value={bathrooms} onChangeText={setBathrooms} keyboardType="numeric" />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <FormField label="Size (sqft)" value={sizeSqft} onChangeText={setSizeSqft} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Plot (sqm)" value={landSize} onChangeText={setLandSize} keyboardType="numeric" />
            </View>
          </View>

          <Text style={[styles.section, { color: colors.text, marginTop: spacing.md }]}>🛣 Access</Text>
          <ChipPicker label="Road" options={ROAD_ACCESS}
            value={roadAccess} onChange={setRoadAccess} themeColor={colors.primary}
          />
          <FormField label="Distance to city (km)" value={proximityToCity}
            onChangeText={setProximityToCity} keyboardType="numeric"
          />

          {/* Booleans */}
          <Text style={[styles.section, { color: colors.text, marginTop: spacing.md }]}>✨ Quality</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <ToggleCard label="Furnished" active={furnished} onPress={() => setFurnished(!furnished)} colors={colors} />
            <ToggleCard label="Modern" active={modernFinish} onPress={() => setModernFinish(!modernFinish)} colors={colors} />
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleEstimate}
            disabled={loading}
            style={[styles.submit, { backgroundColor: loading ? colors.textMuted : colors.primary }]}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.submitText}>Estimate Price 🚀</Text>
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
        backgroundColor: active ? colors.primary + "1A" : colors.background,
        borderColor: active ? colors.primary : colors.border,
        alignItems: "center",
      }}
    >
      <Text style={{
        color: active ? colors.primary : colors.text,
        fontWeight: "700",
      }}>
        {active ? "✓ " : ""}{label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xl,
  },
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
