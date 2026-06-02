// ============================================
// RENTAL CARD - compact, tappable, status-aware
// ============================================
import { View, Text, Image, TouchableOpacity, useColorScheme } from "react-native";
import { getColors } from "../theme/colors";

export default function RentalCard({ rental, onPress }) {
  const colors = getColors(useColorScheme());
  const img = rental.image || (rental.images && rental.images[0]);
  const priceStr = `${Math.round(rental.price).toLocaleString()} ${rental.currency || "RWF"}/mo`;
  const subtitle = `${rental.bedrooms ? `${rental.bedrooms} BR · ` : ""}${rental.sector || rental.district || ""}`;
  const unavailable = rental.availability && rental.availability !== "available";
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82}
      style={{ flexDirection: "row", padding: 10, marginVertical: 4, marginHorizontal: 12,
               backgroundColor: colors.card, borderRadius: 14, borderColor: colors.border, borderWidth: 1 }}>
      {img ? (
        <Image source={{ uri: img }} style={{ width: 92, height: 88, borderRadius: 10 }} />
      ) : (
        <View style={{ width: 92, height: 88, borderRadius: 10, backgroundColor: colors.bg,
                       alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.textMuted, fontSize: 10 }}>No photo</Text>
        </View>
      )}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
          {rental.featured && (
            <Text style={{ backgroundColor: "#f59e0b", color: "#fff", fontSize: 10, fontWeight: "700",
                           paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 6 }}>★ Featured</Text>
          )}
          {unavailable && (
            <Text style={{ backgroundColor: "#ef4444", color: "#fff", fontSize: 10, fontWeight: "700",
                           paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 6, textTransform: "uppercase" }}>
              {rental.availability}
            </Text>
          )}
        </View>
        <Text numberOfLines={1} style={{ color: colors.text, fontWeight: "700", fontSize: 14, marginTop: 2 }}>
          {rental.title}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
        <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 14, marginTop: 4 }}>{priceStr}</Text>
      </View>
    </TouchableOpacity>
  );
}
