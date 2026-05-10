// ============================================
// GOOGLE SIGN-IN BUTTON (native SDK)
// ============================================
// Uses @react-native-google-signin/google-signin which calls Android's
// native Google Play Services. Most reliable approach for Android.
// ⚠️ ONLY works in a real APK build (not Expo Go).

import { useEffect, useState } from "react";
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator,
  View, useColorScheme,
} from "react-native";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { useAuth } from "../context/AuthContext";
import { GOOGLE_WEB_CLIENT_ID } from "../config/google";
import { getColors, spacing, radius } from "../theme/colors";


export default function GoogleSignInButton({ onSuccess, onError }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { loginWithGoogle } = useAuth();

  const [submitting, setSubmitting] = useState(false);

  // Configure once when the component mounts
  useEffect(() => {
    GoogleSignin.configure({
      // The WEB client ID is what backend verifies tokens against.
      // (Even though we're on Android, the ID token "audience" is the web ID
      //  when using Play Services auth - that's the standard flow.)
      webClientId: GOOGLE_WEB_CLIENT_ID,
      // Request the user's email + basic profile
      scopes: ["email", "profile"],
      offlineAccess: false,
    });
  }, []);

  async function handlePress() {
    setSubmitting(true);
    try {
      // 1. Ensure Google Play Services is available
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // 2. Open the native account picker
      const result = await GoogleSignin.signIn();

      // 3. Extract the ID token (handles both old and new SDK response shapes)
      const idToken = result?.data?.idToken || result?.idToken;
      if (!idToken) {
        throw new Error("No ID token returned from Google");
      }

      // 4. Send to OUR backend
      await loginWithGoogle(idToken);
      onSuccess?.();
    } catch (err) {
      // Quiet user-cancel; surface real errors
      if (err?.code === statusCodes.SIGN_IN_CANCELLED) {
        // User dismissed - do nothing
      } else if (err?.code === statusCodes.IN_PROGRESS) {
        onError?.("Sign-in already in progress. Please wait.");
      } else if (err?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        onError?.("Google Play Services not available on this device.");
      } else {
        onError?.(err.message || "Google sign-in failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={submitting}
      style={[styles.btn, {
        backgroundColor: colors.card,
        borderColor: colors.borderStrong,
      }]}
      activeOpacity={0.85}
    >
      {submitting ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <View style={styles.row}>
          <Text style={styles.googleG}>G</Text>
          <Text style={[styles.text, { color: colors.text }]}>
            Continue with Google
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    elevation: 1,
  },
  row: { flexDirection: "row", alignItems: "center" },
  googleG: {
    fontSize: 18,
    fontWeight: "900",
    color: "#4285F4",
    marginRight: spacing.sm,
  },
  text: { fontSize: 15, fontWeight: "700" },
});
