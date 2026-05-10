// ============================================
// CHIP PICKER
// ============================================
// Horizontal scrollable chip list for picking a single value.

import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme } from "react-native";
import { getColors, spacing } from "../theme/colors";

export default function ChipPicker({ label, options, value, onChange, themeColor }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const accent = themeColor || colors.primary;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => onChange(opt)}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: accent, borderColor: accent }
                  : { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <Text
                style={{
                  color: active ? "#fff" : colors.text,
                  fontSize: 13, fontWeight: "700", textTransform: "capitalize",
                }}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, marginRight: 8,
  },
});
