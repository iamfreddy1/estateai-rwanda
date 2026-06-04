// ============================================
// EDIT LISTING SCREEN  (owner-only)
// ============================================
// Pre-fills the form from the existing property and PUTs the diff. A material
// edit on an approved listing drops it back to "pending" server-side, which is
// already reflected in the property model.

import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, useColorScheme, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getPropertyApi, updatePropertyApi } from "../api/properties";
import { getColors, radius, spacing } from "../theme/colors";
import PaymentMethodsField from "../components/PaymentMethodsField";

const TYPE_OPTIONS = ["buy", "rent"];
const PROPERTY_TYPES = ["house", "villa", "apartment", "townhouse", "land"];

export default function EditListingScreen({ route, navigation }) {
  const colors = getColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const { propertyId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({});
  const [payment, setPayment] = useState({
    methods: [], mtn_number: "", airtel_number: "",
    bk_account_number: "", equity_account_number: "",
    account_holder_name: "", show_payment_details: true,
  });

  useEffect(() => {
    getPropertyApi(propertyId)
      .then(p => {
        setForm({
          title: p.title || "", price: String(p.price || ""),
          type: p.type || "rent", property_type: p.property_type || "house",
          district: p.district || "", sector: p.sector || "", location: p.location || "",
          bedrooms: String(p.bedrooms || ""), bathrooms: String(p.bathrooms || ""),
          size_sqft: String(p.size_sqft || ""), year_built: String(p.year_built || ""),
          furnished: !!p.furnished, parking: String(p.parking || 0),
          internet: !!p.amenities?.internet, water: !!p.amenities?.water,
          electricity: !!p.amenities?.electricity, security: !!p.amenities?.security,
        });
        // Pre-fill payment from the property (owner view always returns full data)
        const pay = p.payment || {};
        setPayment({
          methods: pay.methods || [],
          mtn_number:            pay.mtn_number || "",
          airtel_number:         pay.airtel_number || "",
          bk_account_number:     pay.bk_account_number || "",
          equity_account_number: pay.equity_account_number || "",
          account_holder_name:   pay.account_holder_name || "",
          show_payment_details:  pay.show_payment_details !== false,
        });
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [propertyId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.title.trim()) { Alert.alert("Missing title"); return; }
    if (!form.price || isNaN(Number(form.price))) { Alert.alert("Price must be a number"); return; }
    setSaving(true); setErr(null);
    const payload = {
      ...form,
      price: Number(form.price),
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      size_sqft: form.size_sqft ? Number(form.size_sqft) : null,
      year_built: form.year_built ? Number(form.year_built) : null,
      parking: form.parking ? Number(form.parking) : 0,
      // ---- Seller payment methods (server validates) ----
      payment_methods:       payment.methods.join(","),
      mtn_number:            payment.mtn_number || null,
      airtel_number:         payment.airtel_number || null,
      bk_account_number:     payment.bk_account_number || null,
      equity_account_number: payment.equity_account_number || null,
      account_holder_name:   payment.account_holder_name || null,
      show_payment_details:  payment.show_payment_details !== false,
    };
    try {
      const r = await updatePropertyApi(propertyId, payload);
      const droppedToPending = (r.changed || []).includes("status->pending");
      Alert.alert(
        "Listing updated",
        droppedToPending
          ? "Material changes detected — your listing is back in the moderation queue and will be re-published once approved."
          : "Your changes have been saved.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  const Field = ({ label, k, kbd = "default", w = "100%" }) => (
    <View style={{ width: w, marginBottom: 12 }}>
      <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 4 }}>{label}</Text>
      <TextInput value={form[k] ?? ""} onChangeText={t => set(k, t)} keyboardType={kbd}
        placeholderTextColor={colors.textMuted}
        style={{ color: colors.text, padding: 10, borderRadius: 10,
                 backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }} />
    </View>
  );
  const Chip = ({ label, active, onPress }) => (
    <TouchableOpacity onPress={onPress}
      style={{ paddingHorizontal: 14, paddingVertical: 8, marginRight: 6, marginBottom: 6,
               borderRadius: 18, borderWidth: 1,
               backgroundColor: active ? colors.primary : colors.card,
               borderColor: colors.border }}>
      <Text style={{ color: active ? "#fff" : colors.text, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: Math.max(insets.top, 16), paddingBottom: 100 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", marginBottom: 4 }}>✏️ Edit listing</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12 }}>
          Material edits will send the listing back to the moderation queue.
        </Text>
        {err && <Text style={{ color: "#ef4444", marginBottom: 8 }}>{err}</Text>}

        <Field label="Title" k="title" />
        <Field label="Price (RWF)" k="price" kbd="numeric" />

        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 4 }}>TYPE</Text>
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          {TYPE_OPTIONS.map(t => <Chip key={t} label={t === "rent" ? "For Rent" : "For Sale"} active={form.type === t} onPress={() => set("type", t)} />)}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 4 }}>PROPERTY TYPE</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
          {PROPERTY_TYPES.map(t => <Chip key={t} label={t[0].toUpperCase() + t.slice(1)} active={form.property_type === t} onPress={() => set("property_type", t)} />)}
        </View>

        <Field label="District" k="district" />
        <Field label="Sector" k="sector" />
        <Field label="Location (free text)" k="location" />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Bedrooms" k="bedrooms" kbd="numeric" /></View>
          <View style={{ flex: 1 }}><Field label="Bathrooms" k="bathrooms" kbd="numeric" /></View>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Size (sqft)" k="size_sqft" kbd="numeric" /></View>
          <View style={{ flex: 1 }}><Field label="Year built" k="year_built" kbd="numeric" /></View>
        </View>
        <Field label="Parking spaces" k="parking" kbd="numeric" />

        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 8, marginBottom: 6 }}>AMENITIES</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {[["furnished","🛋 Furnished"],["internet","📶 Internet"],["water","💧 Water"],["electricity","💡 Electricity"],["security","🛡 Security"]].map(([k, l]) => (
            <Chip key={k} label={l} active={!!form[k]} onPress={() => set(k, !form[k])} />
          ))}
        </View>

        {/* Seller Payment Methods */}
        <PaymentMethodsField value={payment} onChange={setPayment} colors={colors} />

        <TouchableOpacity onPress={save} disabled={saving}
          style={{ marginTop: 18, padding: 14, borderRadius: radius.md,
                   backgroundColor: saving ? colors.textMuted : colors.primary, alignItems: "center" }}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Save changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
