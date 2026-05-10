import { useColorScheme } from "react-native";
import PropertyListScreen from "../components/PropertyListScreen";
import { getColors } from "../theme/colors";

export default function RentScreen({ navigation }) {
  const colors = getColors(useColorScheme());
  return (
    <PropertyListScreen
      type="rent"
      title="Rentals in Kigali 🔑"
      subtitle="Find your next home"
      themeColor={colors.accent}
      navigation={navigation}
    />
  );
}
