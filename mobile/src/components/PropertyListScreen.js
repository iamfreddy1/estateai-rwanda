// ============================================
// REUSABLE PROPERTY LIST SCREEN
// ============================================
// Hero + search bar + filter button + list with pull-to-refresh.

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { listPropertiesApi } from "../api/properties";
import PropertyCard from "./PropertyCard";
import FilterModal from "./FilterModal";
import { getColors, spacing, radius } from "../theme/colors";

export default function PropertyListScreen({ type, title, subtitle, themeColor, navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const props = await listPropertiesApi({ type, ...filters });
      setProperties(props);
    } catch (err) {
      setError(err.message);
    }
  }, [type, filters]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Client-side text search across title, sector, district
  const visibleProperties = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) => {
      const fields = [p.title, p.sector, p.district, p.property_type];
      return fields.some((f) => f && f.toLowerCase().includes(q));
    });
  }, [properties, search]);

  const activeFilterCount = Object.values(filters).filter((v) => v).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={[styles.hero, { backgroundColor: themeColor || colors.primary }]}>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>

        {/* Search bar inside the hero */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search title, sector, type..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text style={{ color: "#fff", fontSize: 16, paddingHorizontal: 8 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.heroBottom}>
          <Text style={styles.heroCount}>
            {loading ? "Loading..." : `${visibleProperties.length} listings`}
          </Text>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setFilterOpen(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.filterBtnText}>
              ⚙️ Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.danger + "15", borderColor: colors.danger }]}>
          <Text style={{ color: colors.danger }}>⚠️ {error}</Text>
        </View>
      ) : (
        <FlatList
          data={visibleProperties}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: colors.textMuted, fontSize: 15 }}>
                {search ? "No matches for your search." : "No listings match. Try clearing filters."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPress={() => navigation.navigate("PropertyDetails", { propertyId: item.id })}
            />
          )}
        />
      )}

      <FilterModal
        visible={filterOpen}
        initial={filters}
        themeColor={themeColor}
        onClose={() => setFilterOpen(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setFilterOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.lg,
  },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  heroSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    marginTop: spacing.md,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, color: "#fff", fontSize: 14, paddingVertical: 4 },

  heroBottom: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginTop: spacing.md,
  },
  heroCount: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "700" },
  filterBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
  },
  filterBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxl },
  errorBox: {
    margin: spacing.lg, padding: spacing.md, borderRadius: radius.md, borderWidth: 1,
  },
});
