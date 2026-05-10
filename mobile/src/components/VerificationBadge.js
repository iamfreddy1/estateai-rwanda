// ============================================
// VERIFICATION BADGE
// ============================================
// Renders a colored pill showing the user's verification status.

import { Text, View, StyleSheet, useColorScheme } from "react-native";
import { getColors, spacing } from "../theme/colors";

const STATUSES = {
  unverified: { emoji: "🔒", label: "Unverified", colorKey: "textMuted" },
  pending:    { emoji: "⏳", label: "Pending review", colorKey: "warning" },
  verified:   { emoji: "✅", label: "Verified", colorKey: "success" },
  rejected:   { emoji: "❌", label: "Rejected", colorKey: "danger" },
};

export default function VerificationBadge({ status }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const cfg = STATUSES[status] || STATUSES.unverified;
  const color = colors[cfg.colorKey] || colors.textMuted;

  return (
    <View style={[styles.pill, { backgroundColor: color + "1F", borderColor: color }]}>
      <Text style={{ marginRight: 4 }}>{cfg.emoji}</Text>
      <Text style={[styles.text, { color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  text: { fontSize: 12, fontWeight: "700" },
});
