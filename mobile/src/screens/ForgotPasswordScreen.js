// ============================================
// FORGOT PASSWORD SCREEN
// ============================================
// Step 1: enter email -> backend mails a 6-digit code (or prints to console in dev).
// Step 2: enter code + new password -> backend validates + updates.
// Single screen, two phases controlled by `step` state.
import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, useColorScheme, ScrollView, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { forgotPasswordApi, resetPasswordApi } from "../api/auth";
import { getColors } from "../theme/colors";

export default function ForgotPasswordScreen({ navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);                  // 1 = enter email, 2 = enter code+new password
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  async function handleSendCode() {
    setError(null); setInfo(null);
    if (!email.includes("@")) { setError("Enter a valid email."); return; }
    setLoading(true);
    try {
      await forgotPasswordApi(email.trim().toLowerCase());
      setInfo("If that email is registered, a reset code is on its way. Check your inbox (or the backend terminal in dev).");
      setStep(2);
    } catch (e) {
      setError(e.message || "Couldn't send reset code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setError(null); setInfo(null);
    if (!/^\d{6}$/.test(code.trim())) { setError("Code is a 6-digit number."); return; }
    if (newPassword.length < 6) { setError("New password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await resetPasswordApi({ email: email.trim().toLowerCase(), code: code.trim(), newPassword });
      Alert.alert("Password reset", "Please log in with your new password.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (e) {
      setError(e.message || "Couldn't reset password.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    backgroundColor: colors.card, color: colors.text,
    borderColor: colors.border, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 6, fontSize: 16,
  };
  const labelStyle = { color: colors.text, fontWeight: "700", marginTop: 16, fontSize: 14 };
  const btnStyle = {
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14,
    marginTop: 22, alignItems: "center", opacity: loading ? 0.6 : 1,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 32 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: colors.text, marginBottom: 6 }}>
          Reset your password
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
          {step === 1
            ? "Enter the email tied to your AI Property Valuation account. We'll send a 6-digit code."
            : "Enter the code we sent and choose a new password."}
        </Text>

        {step === 1 ? (
          <>
            <Text style={labelStyle}>Email</Text>
            <TextInput
              value={email} onChangeText={setEmail}
              placeholder="you@example.com" placeholderTextColor={colors.textMuted}
              autoCapitalize="none" keyboardType="email-address"
              style={inputStyle} editable={!loading}
            />
            <TouchableOpacity style={btnStyle} onPress={handleSendCode} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Send reset code</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={labelStyle}>6-digit code</Text>
            <TextInput
              value={code} onChangeText={setCode}
              placeholder="123456" placeholderTextColor={colors.textMuted}
              keyboardType="number-pad" maxLength={6}
              style={[inputStyle, { letterSpacing: 6, fontSize: 22, textAlign: "center" }]}
              editable={!loading}
            />
            <Text style={labelStyle}>New password</Text>
            <TextInput
              value={newPassword} onChangeText={setNewPassword}
              placeholder="At least 6 characters" placeholderTextColor={colors.textMuted}
              secureTextEntry style={inputStyle} editable={!loading}
            />
            <TouchableOpacity style={btnStyle} onPress={handleReset} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Reset password</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep(1); setCode(""); setNewPassword(""); setError(null); }} style={{ marginTop: 10, alignItems: "center" }}>
              <Text style={{ color: colors.primary, fontSize: 13 }}>Didn't get a code? Try again</Text>
            </TouchableOpacity>
          </>
        )}

        {error && (
          <View style={{ marginTop: 16, padding: 12, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.08)" }}>
            <Text style={{ color: "#ef4444", fontSize: 13 }}>⚠️  {error}</Text>
          </View>
        )}
        {info && !error && (
          <View style={{ marginTop: 16, padding: 12, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: colors.primary, backgroundColor: "rgba(37,99,235,0.08)" }}>
            <Text style={{ color: colors.text, fontSize: 13 }}>{info}</Text>
          </View>
        )}

        <TouchableOpacity onPress={() => navigation.navigate("Login")} style={{ marginTop: 24, alignItems: "center" }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>← Back to login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
