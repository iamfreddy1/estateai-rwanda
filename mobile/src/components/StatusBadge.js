// ============================================
// PROPERTY STATUS BADGE (pending / approved / rejected)
// ============================================

import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { getColors, spacing } from "../theme/colors";

const STATUSES = {
  pending:  { emoji: "⏳", label: "Awaiting review", colorKey: "warning" },
  approved: { emoji: "✅", label: "Approved", colorKey: "success" },
  rejected: { emoji: "❌", label: "Rejected", colorKey: "danger" },
};

export default function StatusBadge({ status, reason }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const cfg = STATUSES[status];
  if (!cfg) return null;
  const color = colors[cfg.colorKey];

  return (
    <View style={[styles.pill, { backgroundColor: color + "1F", borderColor: color }]}>
      <Text style={{ marginRight: 4 }}>{cfg.emoji}</Text>
      <Text style={[styles.text, { color }]}>{cfg.label}</Text>
      {reason && status === "rejected" && (
        <Text style={[styles.reason, { color }]} numberOfLines={1}> · {reason}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1, alignSelf: "flex-start",
    marginBottom: spacing.sm,
  },
  text: { fontSize: 11, fontWeight: "800" },
  reason: { fontSize: 11, fontWeight: "500", maxWidth: 200 },
});
