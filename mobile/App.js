// ============================================
// APP ENTRY POINT
// ============================================
// Polyfill MUST be the first import - socket.io-client uses URL parsing
// that React Native doesn't ship with by default.
import "react-native-url-polyfill/auto";

import { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { subscribeToNotificationTaps } from "./src/services/pushNotifications";

export default function App() {
  const scheme = useColorScheme();
  const navRef = useRef(null);

  // Wire notification taps -> navigation
  useEffect(() => {
    const unsubscribe = subscribeToNotificationTaps((data) => {
      if (!data || !navRef.current) return;
      if (data.type === "new_message" && data.conversation_id) {
        // Navigate to Messages tab -> Chat with the conversation
        navRef.current.navigate("Main", {
          screen: "Messages",
          params: {
            screen: "Chat",
            params: {
              conversationId: data.conversation_id,
              propertyTitle: data.property_title,
            },
          },
        });
      }
    });
    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer
          ref={navRef}
          theme={scheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <RootNavigator />
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
