// ============================================
// FAVORITES SCREEN
// ============================================
// Lists properties the user has hearted (stored in AsyncStorage).

import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, useColorScheme,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import PropertyCard from "../components/PropertyCard";
import { getFavorites } from "../utils/favorites";
import { getColors, spacing, radius } from "../theme/colors";

export default function FavoritesScreen({ navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const [favs, setFavs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setFavs(await getFavorites());
  }, []);

  // Reload every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        await load();
        setLoading(false);
      })();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.danger }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>❤️ Favorites</Text>
        <Text style={styles.subtitle}>
          {loading ? "Loading..." : `${favs.length} saved ${favs.length === 1 ? "property" : "properties"}`}
        </Text>
      </View>

      <FlatList
        data={favs}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Text style={{ fontSize: 56 }}>💔</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No favorites yet</Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                Tap the heart on any property to save it here.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <PropertyCard
            property={item}
            onPress={() => navigation.navigate("PropertyDetails", { propertyId: item.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.lg,
    position: "relative",
  },
  backBtn: {
    position: "absolute", top: spacing.md, left: spacing.md,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center",
  },
  backTxt: { color: "#fff", fontSize: 22, fontWeight: "800" },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 24 },
  subtitle: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 4 },

  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: 20, fontWeight: "800", marginTop: spacing.md },
  emptyDesc: { fontSize: 14, marginTop: 6, textAlign: "center" },
});
