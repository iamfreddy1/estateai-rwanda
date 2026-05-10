// ============================================
// MAIN BOTTOM TABS (with safe-area aware spacing)
// ============================================
// 6 tabs: Home / Buy / Sell / Messages / AI / Profile

import { Text, useColorScheme, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  HomeStack, BuyStack, SellStack, MessagesStack, EstimateStack, ProfileStack,
} from "./TabStacks";
import { getColors } from "../theme/colors";

const Tab = createBottomTabNavigator();

function tabIcon(emoji) {
  return ({ focused }) => (
    <Text style={{ fontSize: focused ? 22 : 18, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
  );
}

export default function MainTabs() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const insets = useSafeAreaInsets();

  // Add bottom inset so the tab bar clears Android's gesture area
  const bottomPad = Math.max(insets.bottom, Platform.OS === "android" ? 12 : 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 60 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        // Tighter labels to fit 6 tabs
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
      }}
    >
      <Tab.Screen name="Home"     component={HomeStack}     options={{ tabBarIcon: tabIcon("🏠") }} />
      <Tab.Screen name="Buy"      component={BuyStack}      options={{ tabBarIcon: tabIcon("🛒") }} />
      <Tab.Screen name="Sell"     component={SellStack}     options={{ tabBarIcon: tabIcon("➕") }} />
      <Tab.Screen name="Messages" component={MessagesStack} options={{ tabBarIcon: tabIcon("💬") }} />
      <Tab.Screen name="AI"       component={EstimateStack} options={{ tabBarIcon: tabIcon("🤖") }} />
      <Tab.Screen name="Profile"  component={ProfileStack}  options={{ tabBarIcon: tabIcon("👤") }} />
    </Tab.Navigator>
  );
}
