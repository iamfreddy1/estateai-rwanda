// ============================================
// CONFIDENCE BAR
// ============================================
// Animated bar that fills to the confidence percentage.

import { useEffect, useRef } from "react";
import { Animated, View, Text, StyleSheet, useColorScheme } from "react-native";
import { getColors, spacing, radius } from "../theme/colors";

function colorFor(conf, colors) {
  if (conf >= 90) return colors.success;
  if (conf >= 75) return colors.primary;
  if (conf >= 60) return colors.warning;
  return colors.danger;
}

export default function ConfidenceBar({ confidence }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: confidence,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [confidence]);

  const barColor = colorFor(confidence, colors);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>🎯 AI CONFIDENCE</Text>
        <Text style={[styles.pct, { color: barColor }]}>{confidence}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: barColor,
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: spacing.md, borderRadius: radius.md, borderWidth: 1,
  },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 6,
  },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  pct: { fontSize: 18, fontWeight: "800" },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%" },
});
