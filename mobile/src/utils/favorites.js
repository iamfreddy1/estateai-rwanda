// ============================================
// FAVORITES STORAGE
// ============================================
// Local-only favorites stored in AsyncStorage. Each entry is a Property
// object so the Favorites screen can render without an extra fetch.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "estateai_favorites";

export async function getFavorites() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function isFavorite(propertyId) {
  const favs = await getFavorites();
  return favs.some((p) => p.id === propertyId);
}

export async function addFavorite(property) {
  const favs = await getFavorites();
  if (!favs.find((p) => p.id === property.id)) {
    favs.unshift(property);
    await AsyncStorage.setItem(KEY, JSON.stringify(favs));
  }
}

export async function removeFavorite(propertyId) {
  const favs = await getFavorites();
  const next = favs.filter((p) => p.id !== propertyId);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function toggleFavorite(property) {
  const exists = await isFavorite(property.id);
  if (exists) await removeFavorite(property.id);
  else await addFavorite(property);
  return !exists;        // returns new isFavorite state
}
