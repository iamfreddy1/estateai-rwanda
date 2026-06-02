// ============================================
// FLOATING "Ask EstateAI" BUTTON
// ============================================
// Drop on any screen: <AskAIButton />. Navigates to AIChat in ProfileStack.
import { TouchableOpacity, Text, useColorScheme } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getColors } from "../theme/colors";

export default function AskAIButton({ bottom, right = 18, label = "🤖 Ask AI" }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate("Profile", { screen: "AIChat" })}
      activeOpacity={0.85}
      style={{
        position: "absolute",
        right, bottom: bottom ?? (insets.bottom + 78),  // sit above the tab bar
        backgroundColor: colors.primary,
        paddingHorizontal: 16, paddingVertical: 12, borderRadius: 26,
        elevation: 5,
        shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>{label}</Text>
    </TouchableOpacity>
  );
}
