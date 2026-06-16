// ============================================
// SIGNUP SCREEN
// ============================================

import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  useColorScheme,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { getColors, spacing, radius } from "../theme/colors";

export default function SignupScreen({ navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSignup() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await signup(email.trim(), password, name.trim() || null);
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
        <View style={styles.header}>
          <Text style={styles.emoji}>🏡</Text>
          <Text style={[styles.brand, { color: colors.primary }]}>AI Property Valuation</Text>
          <Text style={[styles.welcome, { color: colors.text }]}>Create your account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Join the smartest real estate platform in Kigali
          </Text>
        </View>

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

          {/* Name (optional) */}
          <Text style={[styles.label, { color: colors.text }]}>Name (optional)</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.background, color: colors.text, borderColor: colors.borderStrong,
            }]}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />

          <Text style={[styles.label, { color: colors.text, marginTop: spacing.lg }]}>Email</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.background, color: colors.text, borderColor: colors.borderStrong,
            }]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={[styles.label, { color: colors.text, marginTop: spacing.lg }]}>Password</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.background, color: colors.text, borderColor: colors.borderStrong,
            }]}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
          />

          {error && (
            <View style={[styles.errorBox, { backgroundColor: colors.danger + "15", borderColor: colors.danger }]}>
              <Text style={{ color: colors.danger, fontSize: 13 }}>⚠️ {error}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSignup}
            disabled={loading}
            style={[styles.button, { backgroundColor: loading ? colors.textMuted : colors.primary }]}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={{ color: colors.textSecondary }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={[styles.link, { color: colors.primary }]}>Login</Text>
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
  welcome: { fontSize: 26, fontWeight: "700", marginTop: spacing.lg, textAlign: "center" },
  subtitle: { fontSize: 14, marginTop: spacing.xs, textAlign: "center" },
  card: {
    borderRadius: radius.xl, borderWidth: 1, padding: spacing.xl,
    elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  label: { fontSize: 13, fontWeight: "700" },
  input: {
    borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: 12,
    marginTop: spacing.xs, fontSize: 15, fontWeight: "500",
  },
  errorBox: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md, marginTop: spacing.lg },
  button: { borderRadius: radius.lg, paddingVertical: 14, alignItems: "center", marginTop: spacing.xl },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
  link: { fontWeight: "700" },
  orRow: { flexDirection: "row", alignItems: "center", marginVertical: spacing.lg },
  divider: { flex: 1, height: 1 },
  orText: { fontSize: 11, fontWeight: "800", letterSpacing: 1, marginHorizontal: spacing.md },
});
