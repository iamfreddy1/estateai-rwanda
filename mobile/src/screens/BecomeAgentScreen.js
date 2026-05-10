// ============================================
// BECOME AN AGENT SCREEN
// ============================================
// User submits their agency info + license. Sets agent_status=pending.
// Admin reviews in AdminPendingAgents.

import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, useColorScheme, Alert, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "../context/AuthContext";
import { applyAsAgentApi } from "../api/auth";
import { uploadDocumentApi } from "../api/uploads";
import FormField from "../components/FormField";
import { getColors, spacing, radius } from "../theme/colors";


export default function BecomeAgentScreen({ navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { user, refreshUser } = useAuth();

  const [agency, setAgency] = useState(user?.agency_name || "");
  const [license, setLicense] = useState(user?.license_number || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [areas, setAreas] = useState(user?.areas || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [licenseDocUri, setLicenseDocUri] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  async function pickLicenseDoc() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Please grant photo access.");
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85,
    });
    if (!r.canceled && r.assets?.[0]) setLicenseDocUri(r.assets[0].uri);
  }

  async function handleSubmit() {
    if (!agency.trim() || !license.trim() || !phone.trim()) {
      return Alert.alert("Missing info", "Agency name, license number, and phone are required.");
    }
    setSubmitting(true);
    try {
      let licenseDocUrl = "";
      if (licenseDocUri) {
        const up = await uploadDocumentApi(licenseDocUri, "agent_license");
        licenseDocUrl = up.url;
      }
      await applyAsAgentApi({
        agency_name: agency.trim(),
        license_number: license.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        areas: areas.trim(),
        license_doc_url: licenseDocUrl || null,
      });
      await refreshUser();
      Alert.alert(
        "Application submitted ⏳",
        "Admins will review your agent application within 24 hours.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert("Submission failed", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Logged-out gate
  if (!user) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]} edges={["top"]}>
        <Text style={{ color: colors.text }}>Please log in first.</Text>
      </SafeAreaView>
    );
  }

  // Already approved
  if (user.is_agent) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]} edges={["top"]}>
        <Text style={{ fontSize: 56 }}>✅</Text>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 8 }}>
          You're already a verified agent!
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
          Your listings show the Agent badge.
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}
          style={[styles.submit, { backgroundColor: colors.primary, marginTop: spacing.xl }]}>
          <Text style={styles.submitText}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isPending = user.agent_status === "pending";
  const isRejected = user.agent_status === "rejected";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backTxt}>←</Text>
          </TouchableOpacity>
          <Text style={styles.heroTitle}>👔 Become an Agent</Text>
          <Text style={styles.heroSub}>
            Get a blue verified badge & build trust with buyers
          </Text>
        </View>

        {/* Status banner */}
        {isPending && (
          <View style={[styles.statusCard, { backgroundColor: colors.warning + "15", borderColor: colors.warning }]}>
            <Text style={{ fontSize: 24 }}>⏳</Text>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ color: colors.text, fontWeight: "800" }}>Application under review</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                You can update your details below; we'll re-review.
              </Text>
            </View>
          </View>
        )}
        {isRejected && (
          <View style={[styles.statusCard, { backgroundColor: colors.danger + "15", borderColor: colors.danger }]}>
            <Text style={{ fontSize: 24 }}>❌</Text>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ color: colors.text, fontWeight: "800" }}>Application rejected</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                {user.agent_rejection_reason || "Please update your info and resubmit."}
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FormField label="Agency name *" value={agency} onChangeText={setAgency}
            placeholder="e.g. Kigali Realty" />
          <FormField label="License number *" value={license} onChangeText={setLicense}
            placeholder="e.g. RW-12345" />
          <FormField label="Phone *" value={phone} onChangeText={setPhone}
            placeholder="+250 78x xxx xxx" keyboardType="phone-pad" />
          <FormField label="Areas of expertise" value={areas} onChangeText={setAreas}
            placeholder="e.g. Nyarutarama, Kimihurura, Kacyiru" />
          <FormField label="Bio" value={bio} onChangeText={setBio}
            placeholder="Tell buyers about yourself..." multiline />

          {/* License doc picker */}
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 6 }}>
            License document (optional)
          </Text>
          <TouchableOpacity
            onPress={pickLicenseDoc}
            style={[styles.docPicker, { backgroundColor: colors.background, borderColor: colors.borderStrong }]}
            activeOpacity={0.85}
          >
            {licenseDocUri ? (
              <Image source={{ uri: licenseDocUri }} style={{ width: "100%", height: "100%", borderRadius: radius.lg }} />
            ) : (
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 28 }}>📄</Text>
                <Text style={{ color: colors.textMuted, marginTop: 4 }}>Tap to attach license photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={[styles.submit, { backgroundColor: submitting ? colors.textMuted : colors.primary, marginTop: spacing.lg }]}
            activeOpacity={0.85}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.submitText}>
                {isPending || isRejected ? "Resubmit application" : "Submit application 🚀"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  hero: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg },
  backBtn: {
    position: "absolute", top: spacing.md, left: spacing.md,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  backTxt: { color: "#fff", fontSize: 22, fontWeight: "800" },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 24 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 4 },

  statusCard: {
    flexDirection: "row", alignItems: "center",
    margin: spacing.lg, marginBottom: 0,
    padding: spacing.md, borderRadius: radius.lg, borderWidth: 1,
  },
  card: {
    margin: spacing.lg, padding: spacing.lg,
    borderRadius: radius.xl, borderWidth: 1,
    elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  docPicker: {
    height: 120, borderRadius: radius.lg, borderWidth: 1, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    marginTop: 6,
  },
  submit: { paddingVertical: 14, borderRadius: radius.lg, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
