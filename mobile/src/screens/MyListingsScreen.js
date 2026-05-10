// ============================================
// MY LISTINGS SCREEN
// ============================================
// Shows the current user's listings (any status: pending/approved/rejected).

import { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, useColorScheme,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import PropertyCard from "../components/PropertyCard";
import StatusBadge from "../components/StatusBadge";
import { getMyListingsApi } from "../api/properties";
import { getColors, spacing, radius } from "../theme/colors";

export default function MyListingsScreen({ navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await getMyListingsApi());
    } catch (e) {
      // ignore
    }
  }, []);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Listings</Text>
        <Text style={styles.sub}>
          {loading ? "Loading..." : `${items.length} listing${items.length === 1 ? "" : "s"}`}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id.toString()}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Text style={{ fontSize: 56 }}>🏚</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No listings yet</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4, textAlign: "center" }}>
                Create your first listing from the Sell tab.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View>
            <View style={{ marginBottom: -8, alignItems: "flex-start" }}>
              <StatusBadge status={item.status} reason={item.rejection_reason} />
            </View>
            <PropertyCard
              property={item}
              onPress={() => navigation.navigate("PropertyDetails", { propertyId: item.id })}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg, paddingTop: spacing.md },
  back: { fontSize: 22, color: "#fff", fontWeight: "800" },
  title: { fontSize: 22, color: "#fff", fontWeight: "800", marginTop: 8 },
  sub: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginTop: spacing.md },
});
