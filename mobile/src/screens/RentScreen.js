// ============================================
// RENT SCREEN - browse Kigali rentals with filters
// ============================================
import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, RefreshControl, TextInput, TouchableOpacity,
  ActivityIndicator, useColorScheme, Modal, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { browseRentals, fetchRecentlyViewedRentals } from "../api/rentals";
import { getColors } from "../theme/colors";
import RentalCard from "../components/RentalCard";

const DISTRICTS = ["", "Gasabo", "Kicukiro", "Nyarugenge"];
const PROPERTY_TYPES = ["", "house", "villa", "apartment", "townhouse"];

export default function RentScreen({ navigation }) {
  const colors = getColors(useColorScheme());
  const insets = useSafeAreaInsets();

  const [filters, setFilters] = useState({
    q: "", district: "", property_type: "",
    min_price: "", max_price: "", min_bedrooms: "",
    furnished: false, parking: false, internet: false, security: false,
    sort: "best",
  });
  const [rentals, setRentals] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [recent, setRecent] = useState([]);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const data = await browseRentals(filters);
      setRentals(data.rentals || []); setTotal(data.total || 0);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filters]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useEffect(() => {
    fetchRecentlyViewedRentals().then(setRecent).catch(() => {});
  }, []);

  const apply = () => { setShowFilters(false); };

  const Chip = ({ label, active, onPress }) => (
    <TouchableOpacity onPress={onPress}
      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 8, marginBottom: 8,
               backgroundColor: active ? colors.primary : colors.card,
               borderColor: colors.border, borderWidth: 1 }}>
      <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "600", fontSize: 12 }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header search + filter button */}
      <View style={{ flexDirection: "row", padding: 12, paddingTop: Math.max(insets.top, 12), gap: 8 }}>
        <TextInput value={filters.q} onChangeText={t => setFilters(f => ({ ...f, q: t }))}
          placeholder="Search rentals…" placeholderTextColor={colors.textMuted}
          onSubmitEditing={load}
          style={{ flex: 1, backgroundColor: colors.card, color: colors.text,
                   paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22,
                   borderColor: colors.border, borderWidth: 1, fontSize: 14 }} />
        <TouchableOpacity onPress={() => setShowFilters(true)}
          style={{ paddingHorizontal: 16, justifyContent: "center", backgroundColor: colors.primary, borderRadius: 22 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Result count + sort */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 4 }}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{total} rentals available</Text>
        <TouchableOpacity onPress={() => setFilters(f => ({
          ...f, sort: f.sort === "price_asc" ? "price_desc" : f.sort === "price_desc" ? "newest" : f.sort === "newest" ? "best" : "price_asc"
        }))}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>
            Sort: {filters.sort === "price_asc" ? "Cheapest" : filters.sort === "price_desc" ? "Highest" : filters.sort === "newest" ? "Newest" : "Best value"} ↕
          </Text>
        </TouchableOpacity>
      </View>

      {err && <Text style={{ color: "#ef4444", paddingHorizontal: 16, fontSize: 12 }}>{err}</Text>}

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={recent.length > 0 ? (
            <View style={{ paddingBottom: 6 }}>
              <Text style={{ color: colors.textMuted, fontWeight: "700", fontSize: 12, paddingHorizontal: 16, paddingTop: 6, marginBottom: 4 }}>
                RECENTLY VIEWED
              </Text>
              {recent.slice(0, 3).map(r => (
                <RentalCard key={`recent-${r.id}`} rental={r}
                  onPress={() => navigation.navigate("PropertyDetails", { propertyId: r.id })} />
              ))}
              <Text style={{ color: colors.textMuted, fontWeight: "700", fontSize: 12, paddingHorizontal: 16, paddingTop: 10, marginBottom: 4 }}>
                AVAILABLE NOW
              </Text>
            </View>
          ) : null}
          data={rentals}
          keyExtractor={r => String(r.id)}
          refreshControl={<RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={{ padding: 24, alignItems: "center" }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🏠</Text>
              <Text style={{ color: colors.text, fontWeight: "700" }}>No rentals match your filters</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>Try widening your price range.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <RentalCard rental={item}
              onPress={() => navigation.navigate("PropertyDetails", { propertyId: item.id })} />
          )}
        />
      )}

      {/* Filter modal */}
      <Modal visible={showFilters} animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ paddingTop: Math.max(insets.top, 16), padding: 16, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>Filters</Text>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <Text style={{ color: colors.textMuted, fontWeight: "700", fontSize: 12, marginBottom: 6 }}>DISTRICT</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {DISTRICTS.map(d => (
                <Chip key={d || "any"} label={d || "All"} active={filters.district === d}
                  onPress={() => setFilters(f => ({ ...f, district: d }))} />
              ))}
            </View>
            <Text style={{ color: colors.textMuted, fontWeight: "700", fontSize: 12, marginTop: 8, marginBottom: 6 }}>PROPERTY TYPE</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {PROPERTY_TYPES.map(t => (
                <Chip key={t || "any"} label={t ? t[0].toUpperCase() + t.slice(1) : "All"}
                  active={filters.property_type === t}
                  onPress={() => setFilters(f => ({ ...f, property_type: t }))} />
              ))}
            </View>
            <Text style={{ color: colors.textMuted, fontWeight: "700", fontSize: 12, marginTop: 8, marginBottom: 6 }}>BUDGET (RWF / month)</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TextInput placeholder="Min" placeholderTextColor={colors.textMuted}
                value={String(filters.min_price)} keyboardType="numeric"
                onChangeText={t => setFilters(f => ({ ...f, min_price: t }))}
                style={{ flex: 1, color: colors.text, backgroundColor: colors.card,
                         borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 10 }} />
              <TextInput placeholder="Max" placeholderTextColor={colors.textMuted}
                value={String(filters.max_price)} keyboardType="numeric"
                onChangeText={t => setFilters(f => ({ ...f, max_price: t }))}
                style={{ flex: 1, color: colors.text, backgroundColor: colors.card,
                         borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 10 }} />
            </View>
            <Text style={{ color: colors.textMuted, fontWeight: "700", fontSize: 12, marginTop: 14, marginBottom: 6 }}>BEDROOMS (min)</Text>
            <View style={{ flexDirection: "row" }}>
              {["", "1", "2", "3", "4"].map(b => (
                <Chip key={b || "any"} label={b ? `${b}+` : "Any"} active={String(filters.min_bedrooms) === b}
                  onPress={() => setFilters(f => ({ ...f, min_bedrooms: b }))} />
              ))}
            </View>
            <Text style={{ color: colors.textMuted, fontWeight: "700", fontSize: 12, marginTop: 14, marginBottom: 6 }}>AMENITIES</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {[["furnished","🛋 Furnished"],["parking","🚗 Parking"],["internet","📶 Internet"],
                ["water","💧 Water"],["electricity","💡 Electricity"],["security","🛡 Security"]].map(([k, l]) => (
                <Chip key={k} label={l} active={!!filters[k]}
                  onPress={() => setFilters(f => ({ ...f, [k]: !f[k] }))} />
              ))}
            </View>
          </ScrollView>
          <View style={{ flexDirection: "row", padding: 16, gap: 10, borderTopColor: colors.border, borderTopWidth: 1 }}>
            <TouchableOpacity onPress={() => setFilters({ q: "", district: "", property_type: "", min_price: "", max_price: "", min_bedrooms: "", furnished: false, parking: false, internet: false, security: false, sort: "best" })}
              style={{ flex: 1, padding: 14, borderRadius: 12, borderColor: colors.border, borderWidth: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "700", textAlign: "center" }}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={apply}
              style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.primary }}>
              <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
