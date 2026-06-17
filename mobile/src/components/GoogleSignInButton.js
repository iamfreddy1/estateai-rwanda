// ============================================
// GOOGLE SIGN-IN BUTTON
// ============================================
// Works in BOTH:
//   (a) the custom APK — uses native @react-native-google-signin
//   (b) Expo Go        — falls back to expo-auth-session (web OAuth)
// Both flows end with an ID token sent to the backend's /auth/google.

import { useEffect, useState } from "react";
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator,
  View, useColorScheme, Alert,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";

// ---- Try to load the NATIVE Google module (only present in custom APK) ----
let NativeGoogleSignin = null;
let statusCodes = null;
let NATIVE_AVAILABLE = false;
try {
  const mod = require("@react-native-google-signin/google-signin");
  NativeGoogleSignin = mod.GoogleSignin;
  statusCodes = mod.statusCodes;
  NATIVE_AVAILABLE = !!NativeGoogleSignin;
} catch (_) {
  NATIVE_AVAILABLE = false;
}

import { useAuth } from "../context/AuthContext";
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID } from "../config/google";
import { getColors, spacing, radius } from "../theme/colors";

// Required for expo-auth-session web flow
WebBrowser.maybeCompleteAuthSession();


export default function GoogleSignInButton({ onSuccess, onError }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { loginWithGoogle } = useAuth();

  const [submitting, setSubmitting] = useState(false);

  // ---- (a) NATIVE flow setup ----
  useEffect(() => {
    if (!NATIVE_AVAILABLE) return;
    NativeGoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ["email", "profile"],
      offlineAccess: false,
    });
  }, []);

  // ---- (b) EXPO GO flow setup ----
  // useAuthRequest gives a promptAsync() function and a response object.
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ["openid", "email", "profile"],
  });

  // When the Expo Go flow returns successfully, send the ID token to backend.
  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.authentication?.idToken
                   || response.params?.id_token;
      if (idToken) {
        (async () => {
          setSubmitting(true);
          try {
            await loginWithGoogle(idToken);
            onSuccess?.();
          } catch (e) {
            onError?.(e.message || "Google sign-in failed");
          } finally {
            setSubmitting(false);
          }
        })();
      } else {
        onError?.("Google did not return an ID token. Check OAuth client config.");
      }
    } else if (response?.type === "error") {
      onError?.(response.error?.message || "Google sign-in failed");
    }
  }, [response]);

  async function handlePress() {
    setSubmitting(true);

    // ---- (a) Use NATIVE flow if available ----
    if (NATIVE_AVAILABLE) {
      try {
        await NativeGoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const result = await NativeGoogleSignin.signIn();
        const idToken = result?.data?.idToken || result?.idToken;
        if (!idToken) throw new Error("No ID token returned from Google");
        await loginWithGoogle(idToken);
        onSuccess?.();
      } catch (err) {
        if (statusCodes && err?.code === statusCodes.SIGN_IN_CANCELLED) {
          // User dismissed - do nothing
        } else if (statusCodes && err?.code === statusCodes.IN_PROGRESS) {
          onError?.("Sign-in already in progress. Please wait.");
        } else if (statusCodes && err?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          onError?.("Google Play Services not available on this device.");
        } else {
          onError?.(err.message || "Google sign-in failed");
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // ---- (b) Otherwise (Expo Go) use the web OAuth flow ----
    try {
      await promptAsync();
      // setSubmitting(false) is handled by the useEffect on response
    } catch (e) {
      onError?.(e.message || "Could not open Google sign-in");
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
