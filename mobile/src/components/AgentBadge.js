// ============================================
// AGENT BADGE
// ============================================
// Tiny inline blue checkmark shown next to agent names + property cards.
// Inspired by Twitter/X verified badges.

import { View, Text, StyleSheet } from "react-native";

export default function AgentBadge({ size = 14, label = "Agent", showLabel = false }) {
  return (
    <View style={styles.row}>
      <View style={[styles.tick, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.check, { fontSize: size * 0.65 }]}>✓</Text>
      </View>
      {showLabel && (
        <Text style={[styles.label, { fontSize: size * 0.85 }]}>{label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  tick: {
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  check: { color: "#fff", fontWeight: "900", lineHeight: 14 },
  label: { color: "#2563eb", fontWeight: "700", marginLeft: 4 },
});
