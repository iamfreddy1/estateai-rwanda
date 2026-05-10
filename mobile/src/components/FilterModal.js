// ============================================
// FILTER MODAL
// ============================================
// Bottom-sheet style modal with filter inputs.
// Returns the chosen filters via onApply.

import { useState, useEffect } from "react";
import {
  Modal, View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, useColorScheme,
} from "react-native";
import {
  DISTRICTS, SECTORS_BY_DISTRICT, ALL_PROPERTY_TYPES
} from "../constants/locations";
import { getColors, spacing, radius } from "../theme/colors";

export default function FilterModal({ visible, initial, onClose, onApply, themeColor }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const accent = themeColor || colors.primary;

  const [district, setDistrict] = useState(initial?.district || "");
  const [sector, setSector] = useState(initial?.sector || "");
  const [propertyType, setPropertyType] = useState(initial?.property_type || "");
  const [minPrice, setMinPrice] = useState(initial?.min_price?.toString() || "");
  const [maxPrice, setMaxPrice] = useState(initial?.max_price?.toString() || "");
  const [bedrooms, setBedrooms] = useState(initial?.bedrooms?.toString() || "");

  // Reset when reopened
  useEffect(() => {
    if (visible) {
      setDistrict(initial?.district || "");
      setSector(initial?.sector || "");
      setPropertyType(initial?.property_type || "");
      setMinPrice(initial?.min_price?.toString() || "");
      setMaxPrice(initial?.max_price?.toString() || "");
      setBedrooms(initial?.bedrooms?.toString() || "");
    }
  }, [visible, initial]);

  const sectorsAvailable = district
    ? SECTORS_BY_DISTRICT[district] || []
    : Object.values(SECTORS_BY_DISTRICT).flat();

  function handleClear() {
    setDistrict(""); setSector(""); setPropertyType("");
    setMinPrice(""); setMaxPrice(""); setBedrooms("");
  }

  function handleApply() {
    onApply({
      district,
      sector,
      property_type: propertyType,
      min_price: minPrice,
      max_price: maxPrice,
      bedrooms,
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Filter Listings</Text>

          <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>

            {/* District chips */}
            <Text style={[styles.label, { color: colors.text }]}>District</Text>
            <View style={styles.chips}>
              <Chip text="All" active={!district} onPress={() => { setDistrict(""); setSector(""); }} colors={colors} accent={accent} />
              {DISTRICTS.map((d) => (
                <Chip key={d} text={d}
                  active={district === d}
                  onPress={() => { setDistrict(d); setSector(""); }}
                  colors={colors} accent={accent} />
              ))}
            </View>

            {/* Sector chips */}
            <Text style={[styles.label, { color: colors.text, marginTop: spacing.lg }]}>Sector</Text>
            <View style={styles.chips}>
              <Chip text="All" active={!sector} onPress={() => setSector("")} colors={colors} accent={accent} />
              {sectorsAvailable.map((s) => (
                <Chip key={s} text={s}
                  active={sector === s}
                  onPress={() => setSector(s)}
                  colors={colors} accent={accent} />
              ))}
            </View>

            {/* Property type */}
            <Text style={[styles.label, { color: colors.text, marginTop: spacing.lg }]}>Type</Text>
            <View style={styles.chips}>
              <Chip text="Any" active={!propertyType} onPress={() => setPropertyType("")} colors={colors} accent={accent} />
              {ALL_PROPERTY_TYPES.map((t) => (
                <Chip key={t} text={t}
                  active={propertyType === t}
                  onPress={() => setPropertyType(t)}
                  colors={colors} accent={accent} />
              ))}
            </View>

            {/* Price */}
            <Text style={[styles.label, { color: colors.text, marginTop: spacing.lg }]}>Price (RWF)</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.borderStrong }]}
                placeholder="Min"
                placeholderTextColor={colors.textMuted}
                value={minPrice}
                onChangeText={setMinPrice}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.borderStrong }]}
                placeholder="Max"
                placeholderTextColor={colors.textMuted}
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="numeric"
              />
            </View>

            {/* Bedrooms */}
            <Text style={[styles.label, { color: colors.text, marginTop: spacing.lg }]}>Min bedrooms</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.borderStrong }]}
              placeholder="e.g. 3"
              placeholderTextColor={colors.textMuted}
              value={bedrooms}
              onChangeText={setBedrooms}
              keyboardType="numeric"
            />
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
              onPress={handleClear}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: accent }]}
              onPress={handleApply}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Chip({ text, active, onPress, colors, accent }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        active
          ? { backgroundColor: accent, borderColor: accent }
          : { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <Text style={{
        color: active ? "#fff" : colors.text,
        fontSize: 12, fontWeight: "700", textTransform: "capitalize",
      }}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl, paddingBottom: spacing.xl,
    maxHeight: "85%",
  },
  handleWrap: { alignItems: "center", paddingTop: spacing.md, paddingBottom: spacing.lg },
  handle: { width: 44, height: 4, borderRadius: 2 },
  title: { fontSize: 20, fontWeight: "800", marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: "700", marginBottom: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1,
  },
  input: {
    flex: 1, borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 14, fontWeight: "500",
  },
  actions: {
    flexDirection: "row", gap: spacing.sm,
    marginTop: spacing.lg, paddingTop: spacing.md,
    borderTopColor: "rgba(0,0,0,0.05)", borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1, paddingVertical: 12, borderRadius: radius.lg,
    alignItems: "center",
  },
});
