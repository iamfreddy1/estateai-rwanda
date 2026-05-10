import { useColorScheme } from "react-native";
import PropertyListScreen from "../components/PropertyListScreen";
import { getColors } from "../theme/colors";

export default function BuyScreen({ navigation }) {
  const colors = getColors(useColorScheme());
  return (
    <PropertyListScreen
      type="buy"
      title="Properties for Sale 🏡"
      subtitle="Browse Kigali homes & land"
      themeColor={colors.primary}
      navigation={navigation}
    />
  );
}
