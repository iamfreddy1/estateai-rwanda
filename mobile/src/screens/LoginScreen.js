// ============================================
// LOGIN SCREEN
// ============================================
// Email + password → calls Flask /auth/login via AuthContext.

import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  useColorScheme, Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { getColors, spacing, radius } from "../theme/colors";

export default function LoginScreen({ navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleLogin() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter both email and password");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      // RootNavigator will swap to Main automatically when user state updates
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🏡</Text>
          <Text style={[styles.brand, { color: colors.primary }]}>AI Property Valuation</Text>
          <Text style={[styles.welcome, { color: colors.text }]}>Welcome back 👋</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to continue to your account
          </Text>
        </View>

        {/* CARD */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

          {/* Google Sign-in */}
          <GoogleSignInButton
            onError={(msg) => setError(msg)}
          />

          {/* OR divider */}
          <View style={styles.orRow}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.orText, { color: colors.textMuted }]}>OR</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>

          {/* Email */}
          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.borderStrong,
            }]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          {/* Password */}
          <Text style={[styles.label, { color: colors.text, marginTop: spacing.lg }]}>Password</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.borderStrong,
            }]}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
          />

          {/* Error */}
          {error && (
            <View style={[styles.errorBox, { backgroundColor: colors.danger + "15", borderColor: colors.danger }]}>
              <Text style={{ color: colors.danger, fontSize: 13 }}>⚠️ {error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={[styles.button, {
              backgroundColor: loading ? colors.textMuted : colors.primary,
            }]}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Switch to signup */}
          <View style={styles.switchRow}>
            <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}
              style={{ marginBottom: 14, alignItems: "center" }}>
              <Text style={[styles.link, { color: colors.primary, fontSize: 13 }]}>Forgot password?</Text>
            </TouchableOpacity>
            <Text style={{ color: colors.textSecondary }}>New here? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
              <Text style={[styles.link, { color: colors.primary }]}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.xl, paddingTop: spacing.xxl + 24 },
  header: { alignItems: "center", marginBottom: spacing.xl },
  emoji: { fontSize: 56 },
  brand: { fontSize: 24, fontWeight: "800", marginTop: spacing.xs },
  welcome: { fontSize: 28, fontWeight: "700", marginTop: spacing.lg },
  subtitle: { fontSize: 14, marginTop: spacing.xs },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  label: { fontSize: 13, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    marginTop: spacing.xs,
    fontSize: 15,
    fontWeight: "500",
  },
  errorBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  button: {
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  link: { fontWeight: "700" },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  divider: { flex: 1, height: 1 },
  orText: { fontSize: 11, fontWeight: "800", letterSpacing: 1, marginHorizontal: spacing.md },
});
