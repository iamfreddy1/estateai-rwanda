// ============================================
// PREMIUM UPGRADE SCREEN
// ============================================
// Landlords pay X RWF/month to unlock premium features:
//   - View all incoming inquiry phone numbers automatically
//   - "Featured" badge on listings (when admin approves)
//   - See contact of any seller/landlord without per-unlock fees
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { lightColors as COLORS } from "../theme/colors";
import { initPremium, pollUntilDone } from "../api/payments";
import { useAuth } from "../context/AuthContext";

const PERKS = [
  { icon: "★", text: "Unlimited contact unlocks (see any phone instantly)" },
  { icon: "↑", text: "Boost your listings — appear higher in search results" },
  { icon: "◆", text: "Featured badge eligibility" },
  { icon: "▣", text: "Advanced landlord analytics (visit charts, inquiry trends)" },
  { icon: "✉", text: "Priority email + WhatsApp support" },
];

export default function PremiumUpgradeScreen() {
  const nav = useNavigation();
  const { user, refreshUser } = useAuth();
  const [phone, setPhone] = useState(user?.phone || "");
  const [provider, setProvider] = useState("mtn");
  const [stage, setStage] = useState("idle");  // idle | paying | waiting | done | fail
  const [error, setError] = useState("");
  const PRICE = 5000;

  async function pay() {
    if (!phone || phone.replace(/\D/g, "").length < 9) {
      setError("Enter your mobile money number"); return;
    }
    setError(""); setStage("paying");
    try {
      const res = await initPremium({ phone, provider });
      setStage("waiting");
      const final = await pollUntilDone(res.payment.id);
      if (final.status === "success") {
        setStage("done");
        refreshUser && refreshUser();
      } else {
        setError("Payment was not completed. Please try again.");
        setStage("fail");
      }
    } catch (e) {
      setError(e?.response?.data?.error || "Could not start payment.");
      setStage("fail");
    }
  }

  return (
    <ScrollView style={styles.wrap}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>EstateAI</Text>
        <Text style={styles.heroTitle}>Landlord Premium</Text>
        <Text style={styles.heroPrice}>{PRICE.toLocaleString()} RWF<Text style={styles.per}> / month</Text></Text>
      </View>

      <View style={styles.perksCard}>
        {PERKS.map((p, i) => (
          <View key={i} style={styles.perkRow}>
            <Text style={styles.perkIcon}>{p.icon}</Text>
            <Text style={styles.perkText}>{p.text}</Text>
          </View>
        ))}
      </View>

      {user?.is_premium && (
        <View style={[styles.box, { backgroundColor: "#16a34a22" }]}>
          <Text style={{ color: "#15803d", fontWeight: "700" }}>
            You're already a Premium member 🎉
          </Text>
          {user.premium_until && (
            <Text style={{ color: "#15803d", marginTop: 4 }}>
              Active until {new Date(user.premium_until).toLocaleDateString()}
            </Text>
          )}
        </View>
      )}

      {stage === "idle" || stage === "fail" ? (
        <View style={styles.formCard}>
          <Text style={styles.label}>Pay with</Text>
          <View style={styles.providerRow}>
            <TouchableOpacity
              style={[styles.provider, provider === "mtn" && styles.providerActive]}
              onPress={() => setProvider("mtn")}
            >
              <Text style={[styles.providerText, provider === "mtn" && styles.providerTextActive]}>
                MTN MoMo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.provider, provider === "airtel" && styles.providerActive]}
              onPress={() => setProvider("airtel")}
            >
              <Text style={[styles.providerText, provider === "airtel" && styles.providerTextActive]}>
                Airtel Money
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Your mobile money number</Text>
          <TextInput
            style={styles.input} value={phone} onChangeText={setPhone}
            placeholder="0788 123 456" keyboardType="phone-pad"
            placeholderTextColor={COLORS.textMuted}
          />
          {error ? <Text style={styles.err}>{error}</Text> : null}

          <TouchableOpacity style={styles.payBtn} onPress={pay}>
            <Text style={styles.payBtnText}>Upgrade for {PRICE.toLocaleString()} RWF</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {(stage === "paying" || stage === "waiting") && (
        <View style={[styles.box, { alignItems: "center" }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 16, textAlign: "center", color: COLORS.text }}>
            {stage === "paying"
              ? "Sending payment request..."
              : "Check your phone and enter your MoMo PIN to approve."}
          </Text>
        </View>
      )}

      {stage === "done" && (
        <View style={[styles.box, { backgroundColor: "#16a34a22" }]}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#15803d" }}>
            Welcome to Premium 🎉
          </Text>
          <Text style={{ color: "#15803d", marginTop: 6 }}>
            Your account is now Premium. Enjoy unlimited contact unlocks for the next 30 days.
          </Text>
          <TouchableOpacity style={styles.payBtn} onPress={() => nav.goBack()}>
            <Text style={styles.payBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#f6f7fb" },
  hero: { backgroundColor: COLORS.primary, padding: 24, alignItems: "center" },
  heroLabel: { color: "#ffffffaa", fontSize: 13, letterSpacing: 2 },
  heroTitle: { color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 6 },
  heroPrice: { color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 12 },
  per: { fontSize: 16, fontWeight: "500" },
  perksCard: { backgroundColor: "#fff", margin: 16, padding: 16, borderRadius: 14 },
  perkRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 8 },
  perkIcon: { fontSize: 18, color: COLORS.primary, width: 28 },
  perkText: { flex: 1, fontSize: 14, color: COLORS.text },
  formCard: { backgroundColor: "#fff", margin: 16, padding: 16, borderRadius: 14 },
  box: { backgroundColor: "#fff", margin: 16, padding: 16, borderRadius: 14 },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.text, marginTop: 8, marginBottom: 8 },
  providerRow: { flexDirection: "row", gap: 8 },
  provider: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1.5,
              borderColor: "#e5e5e5", alignItems: "center" },
  providerActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + "11" },
  providerText: { fontSize: 14, fontWeight: "600", color: COLORS.textMuted },
  providerTextActive: { color: COLORS.primary },
  input: { borderWidth: 1.5, borderColor: "#e5e5e5", borderRadius: 10,
           padding: 14, fontSize: 16, color: COLORS.text },
  payBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12,
            alignItems: "center", marginTop: 18 },
  payBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  err: { color: "#dc2626", fontSize: 13, marginTop: 8 },
});
