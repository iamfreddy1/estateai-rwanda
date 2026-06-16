// ============================================
// SELL SCREEN
// ============================================
// Create a new property listing. Calls POST /properties.
// Supports house OR land toggle, image picker via expo-image-picker.

import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image, Alert,
  StyleSheet, ActivityIndicator, useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "../context/AuthContext";
import { createPropertyApi, attachOwnershipDocApi } from "../api/properties";
import { uploadImageApi, uploadDocumentApi } from "../api/uploads";
import FormField from "../components/FormField";
import ChipPicker from "../components/ChipPicker";
import {
  DISTRICTS, SECTORS_BY_DISTRICT, PROPERTY_TYPES_HOUSE, ROAD_ACCESS,
} from "../constants/locations";
import { getColors, spacing, radius } from "../theme/colors";


export default function SellScreen({ navigation }) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { user } = useAuth();

  // Toggles
  const [listingKind, setListingKind] = useState("house");  // "house" or "land"
  const [type, setType] = useState("buy");                  // "buy" or "rent"

  // Common fields
  const [title, setTitle] = useState("");
  const [propertyType, setPropertyType] = useState("house");
  const [district, setDistrict] = useState("Gasabo");
  const [sector, setSector] = useState("Kacyiru");
  const [price, setPrice] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [ownershipDocUri, setOwnershipDocUri] = useState(null);

  // House
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [sizeSqft, setSizeSqft] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");

  // Land + shared
  const [landSize, setLandSize] = useState("");
  const [roadAccess, setRoadAccess] = useState("paved");
  const [proximity, setProximity] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const sectorsForDistrict = SECTORS_BY_DISTRICT[district] || [];

  // ---------- Image picker ----------
  async function handlePickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please grant access to your photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  function reset() {
    setTitle(""); setPrice("");
    setBedrooms(""); setBathrooms(""); setSizeSqft(""); setYearBuilt("");
    setLandSize(""); setRoadAccess("paved"); setProximity("");
    setImageUri(null);
    setOwnershipDocUri(null);
  }

  async function handlePickOwnershipDoc() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please grant access to your photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setOwnershipDocUri(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!title.trim()) return Alert.alert("Missing field", "Please enter a title");
    if (!price || Number(price) <= 0) return Alert.alert("Missing field", "Please enter a valid price");
    if (!ownershipDocUri) {
      return Alert.alert(
        "Ownership document required",
        "To verify your listing, please attach a photo of the ownership document."
      );
    }

    setSubmitting(true);
    try {
      // 1. Upload property photo (if any) to Cloudinary
      let imageUrl = "";
      if (imageUri) {
        const photoUpload = await uploadImageApi(imageUri);
        imageUrl = photoUpload.url;
      }

      // 2. Upload ownership doc to Cloudinary
      const docUpload = await uploadDocumentApi(ownershipDocUri, "ownership_proof");

      // 3. Create the listing with both URLs attached
      const payload = {
        title: title.trim(),
        type,
        currency: "RWF",
        property_type: listingKind === "land" ? "land" : propertyType,
        district,
        sector,
        price: Number(price),
        image: imageUrl,
        ownership_doc: docUpload.url,
        road_access: roadAccess,
        proximity_to_city: proximity ? Number(proximity) : null,
      };
      if (listingKind === "house") {
        payload.bedrooms   = bedrooms ? Number(bedrooms) : null;
        payload.bathrooms  = bathrooms ? Number(bathrooms) : null;
        payload.size_sqft  = sizeSqft ? Number(sizeSqft) : null;
        payload.year_built = yearBuilt ? Number(yearBuilt) : null;
        payload.land_size  = landSize ? Number(landSize) : null;
      } else {
        payload.land_size = landSize ? Number(landSize) : null;
      }

      const newProp = await createPropertyApi(payload);
      Alert.alert(
        "Submitted! ⏳",
        `"${newProp.title}" was submitted for admin review. You'll be notified once approved.`,
        [{ text: "OK", onPress: () => { reset(); navigation.navigate("Profile"); } }]
      );
    } catch (err) {
      Alert.alert("Could not submit", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- Logged-out gate ----------
  if (!user) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]} edges={["top"]}>
        <Text style={{ fontSize: 56 }}>🔒</Text>
        <Text style={[styles.gateTitle, { color: colors.text }]}>Login required</Text>
        <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 8 }}>
          You need an account to list a property.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={[styles.hero, { backgroundColor: colors.success }]}>
          <Text style={styles.heroTitle}>List Your Property 📝</Text>
          <Text style={styles.heroSubtitle}>Add a new Kigali listing in seconds</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

          {/* House / Land toggle */}
          <View style={styles.toggleRow}>
            <ToggleBtn
              label="🏠 House"
              active={listingKind === "house"}
              activeColor={colors.primary}
              onPress={() => { setListingKind("house"); setPropertyType("house"); }}
              colors={colors}
            />
            <ToggleBtn
              label="🌳 Land"
              active={listingKind === "land"}
              activeColor={colors.accentLand}
              onPress={() => setListingKind("land")}
              colors={colors}
            />
          </View>

          {/* Image picker */}
          <Text style={[styles.label, { color: colors.text }]}>Photo (optional)</Text>
          <TouchableOpacity
            onPress={handlePickImage}
            style={[styles.imagePicker, { backgroundColor: colors.background, borderColor: colors.borderStrong }]}
            activeOpacity={0.85}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%", borderRadius: radius.lg }} />
            ) : (
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 36 }}>📷</Text>
                <Text style={{ color: colors.textMuted, marginTop: 4 }}>Tap to pick a property photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Ownership doc picker (REQUIRED for verification) */}
          <Text style={[styles.label, { color: colors.text, marginTop: spacing.md }]}>
            🪪 Ownership document <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <TouchableOpacity
            onPress={handlePickOwnershipDoc}
            style={[styles.imagePicker, { backgroundColor: colors.background, borderColor: colors.danger + "60" }]}
            activeOpacity={0.85}
          >
            {ownershipDocUri ? (
              <Image source={{ uri: ownershipDocUri }} style={{ width: "100%", height: "100%", borderRadius: radius.lg }} />
            ) : (
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 36 }}>📄</Text>
                <Text style={{ color: colors.text, fontWeight: "700", marginTop: 4 }}>
                  Required for verification
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2, textAlign: "center", paddingHorizontal: 16 }}>
                  Upload land contract, ownership certificate, or sale deed
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Basic info */}
          <FormField label="Title" value={title} onChangeText={setTitle}
            placeholder={listingKind === "land" ? "e.g. 800 sqm plot in Kimihurura" : "e.g. Modern villa in Nyarutarama"} />

          {listingKind === "house" && (
            <ChipPicker label="Property Type" options={PROPERTY_TYPES_HOUSE}
              value={propertyType} onChange={setPropertyType} themeColor={colors.primary} />
          )}

          <ChipPicker label="Listing Type"
            options={listingKind === "house" ? ["buy", "rent"] : ["buy"]}
            value={type} onChange={setType}
            themeColor={colors.primary}
          />

          {/* Location */}
          <ChipPicker label="District" options={DISTRICTS}
            value={district}
            onChange={(d) => { setDistrict(d); setSector(SECTORS_BY_DISTRICT[d][0]); }}
            themeColor={colors.primary}
          />
          <ChipPicker label="Sector" options={sectorsForDistrict}
            value={sector} onChange={setSector} themeColor={colors.primary} />

          {/* Price */}
          <FormField label="Price (RWF)" value={price} onChangeText={setPrice}
            placeholder="e.g. 150000000" keyboardType="numeric" />

          {/* House-only fields */}
          {listingKind === "house" && (
            <>
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <FormField label="Bedrooms" value={bedrooms} onChangeText={setBedrooms}
                    placeholder="3" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField label="Bathrooms" value={bathrooms} onChangeText={setBathrooms}
                    placeholder="2" keyboardType="numeric" />
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <FormField label="Size (sqft)" value={sizeSqft} onChangeText={setSizeSqft}
                    placeholder="1500" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField label="Year built" value={yearBuilt} onChangeText={setYearBuilt}
                    placeholder="2020" keyboardType="numeric" />
                </View>
              </View>
            </>
          )}

          {/* Land details */}
          <FormField
            label={listingKind === "land" ? "Land size (sqm)" : "Plot size (sqm)"}
            value={landSize} onChangeText={setLandSize}
            placeholder="800" keyboardType="numeric"
          />

          <ChipPicker label="Road access" options={ROAD_ACCESS}
            value={roadAccess} onChange={setRoadAccess} themeColor={colors.primary} />

          <FormField label="Distance to city (km)" value={proximity} onChangeText={setProximity}
            placeholder="5" keyboardType="numeric" />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submit, { backgroundColor: submitting ? colors.textMuted : colors.success }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.submitText}>Publish Listing 🚀</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleBtn({ label, active, activeColor, onPress, colors }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.toggle,
        active
          ? { backgroundColor: activeColor, borderColor: activeColor }
          : { backgroundColor: colors.background, borderColor: colors.border },
      ]}
      activeOpacity={0.85}
    >
      <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "800", fontSize: 14 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl },
  hero: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  heroSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 2 },
  card: {
    margin: spacing.lg, padding: spacing.lg,
    borderRadius: radius.xl, borderWidth: 1,
    elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  toggleRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  toggle: {
    flex: 1, paddingVertical: 12,
    borderRadius: radius.lg, borderWidth: 1, alignItems: "center",
  },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  imagePicker: {
    height: 160, borderRadius: radius.lg, borderWidth: 1, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", marginBottom: spacing.lg,
    overflow: "hidden",
  },
  submit: {
    paddingVertical: 14, borderRadius: radius.lg,
    alignItems: "center", marginTop: spacing.md,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  gateTitle: { fontSize: 22, fontWeight: "800", marginTop: spacing.md },
});
