// ============================================
// TEMPORARY HOME SCREEN
// ============================================
// Just shows the logged-in user info + a logout button.
// Replaced in M3 with the real Home + bottom tabs.

import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, SafeAreaView } from "react-native";
import { useAuth } from "../context/AuthContext";
import { getColors, spacing, radius } from "../theme/colors";

export default function HomeScreenTemp() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={[styles.title, { color: colors.primary }]}>You're logged in!</Text>
        <Text style={[styles.text, { color: colors.text, marginTop: spacing.lg }]}>
          Hi, <Text style={{ fontWeight: "800" }}>{user?.name || user?.email?.split("@")[0]}</Text> 👋
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {user?.email}
        </Text>
        <Text style={[styles.note, { color: colors.textMuted }]}>
          The real Home + tabs will be built in M3.
        </Text>

        <TouchableOpacity
          onPress={logout}
          style={[styles.button, { backgroundColor: colors.danger }]}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.xl },
  card: {
    borderRadius: radius.xl, borderWidth: 1, padding: spacing.xl,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  emoji: { fontSize: 64 },
  title: { fontSize: 24, fontWeight: "800", marginTop: spacing.md },
  text: { fontSize: 16 },
  note: { fontSize: 12, marginTop: spacing.lg, fontStyle: "italic" },
  button: {
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.xxl,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
