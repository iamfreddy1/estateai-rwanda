// ============================================
// VERIFY IDENTITY SCREEN
// ============================================
// User picks/takes a photo of their national ID, uploads it, and
// the backend marks them as "pending" for admin review.

import { useState } from "react";
import {
  View, Text, TouchableOpacity, Image, ActivityIndicator,
  StyleSheet, Alert, useColorScheme, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "../context/AuthContext";
import { uploadDocumentApi } from "../api/uploads";
import { attachNationalIdApi } from "../api/auth";
import VerificationBadge from "../components/VerificationBadge";
import { getColors, spacing, radius } from "../theme/colors";


export default function VerifyIdentityScreen({ navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { user, refreshUser } = useAuth();

  const [picked, setPicked] = useState(null);     // local URI
  const [submitting, setSubmitting] = useState(false);

  async function handlePick(useCamera = false) {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", `Please grant ${useCamera ? "camera" : "photo"} access.`);
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
    if (!result.canceled && result.assets?.[0]) {
      setPicked(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!picked) {
      Alert.alert("Pick a photo", "Take or choose a photo of your national ID first.");
      return;
    }
    setSubmitting(true);
    try {
      const upload = await uploadDocumentApi(picked, "national_id");
      await attachNationalIdApi(upload.url);
      await refreshUser();
      Alert.alert(
        "Submitted ✅",
        "Your ID is now pending admin verification. You'll get a notification when it's approved.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert("Upload failed", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>

        {/* Header */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
          <Text style={[styles.backTxt, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>🪪 Verify your identity</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Upload a clear photo of your national ID to unlock seller features.
          Our admins review uploads within 24 hours.
        </Text>

        {/* Current status */}
        <View style={{ marginTop: spacing.lg }}>
          <VerificationBadge status={user?.verification_status} />
        </View>

        {/* Photo preview / placeholder */}
        <View style={[styles.photoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {picked ? (
            <Image source={{ uri: picked }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={styles.empty}>
              <Text style={{ fontSize: 56 }}>🪪</Text>
              <Text style={{ color: colors.textMuted, marginTop: 8 }}>
                No photo selected
              </Text>
            </View>
          )}
        </View>

        {/* Pick buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.pickBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
            onPress={() => handlePick(true)}
            activeOpacity={0.85}
          >
            <Text style={{ color: colors.text, fontWeight: "700" }}>📷 Take photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pickBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
            onPress={() => handlePick(false)}
            activeOpacity={0.85}
          >
            <Text style={{ color: colors.text, fontWeight: "700" }}>🖼 Choose existing</Text>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!picked || submitting}
          style={[styles.submit, {
            backgroundColor: !picked || submitting ? colors.textMuted : colors.primary,
          }]}
          activeOpacity={0.85}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.submitText}>Submit for review 🚀</Text>
          )}
        </TouchableOpacity>

        {/* Tip card */}
        <View style={[styles.tip, { backgroundColor: colors.warning + "15", borderColor: colors.warning }]}>
          <Text style={{ color: colors.text, fontWeight: "600", marginBottom: 4 }}>💡 Tips</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
            • Use good lighting{"\n"}
            • All four corners visible{"\n"}
            • No glare on the photo / hologram{"\n"}
            • Don't crop out the ID number
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  backArrow: { fontSize: 22, fontWeight: "800", marginRight: 6 },
  backTxt: { fontSize: 15, fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "800" },
  sub: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  photoBox: {
    height: 240, borderRadius: radius.lg, borderWidth: 1, borderStyle: "dashed",
    overflow: "hidden", marginTop: spacing.lg, justifyContent: "center", alignItems: "center",
  },
  preview: { width: "100%", height: "100%" },
  empty: { alignItems: "center" },
  buttonRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  pickBtn: {
    flex: 1, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1, alignItems: "center",
  },
  submit: {
    marginTop: spacing.lg, paddingVertical: 14, borderRadius: radius.lg, alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  tip: {
    marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, borderWidth: 1,
  },
});
