// ============================================
// SPLASH SCREEN
// ============================================
// Shown briefly while we check if the user has a saved token.

import { View, Text, ActivityIndicator, StyleSheet, useColorScheme } from "react-native";
import { getColors, spacing } from "../theme/colors";

export default function SplashScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <Text style={styles.emoji}>🏡</Text>
      <Text style={styles.title}>EstateAI</Text>
      <Text style={styles.tag}>Rwanda 🇷🇼</Text>
      <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: spacing.xxl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: { fontSize: 80, marginBottom: spacing.md },
  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
  },
  tag: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fef9c3",
    marginTop: spacing.xs,
  },
});
