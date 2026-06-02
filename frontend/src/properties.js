// ============================================
// PROPERTY API HELPER (Rwanda Edition)
// ============================================
// Wraps the /properties endpoints + AI predict + analytics.

import { getToken } from "./auth";

//const API_URL = "http://localhost:5000";
const API_URL = "http://127.0.0.1:5000";


// ---------- GET /properties (with rich filters) ----------
// filters: { type, property_type, district, sector, location,
//            min_price, max_price, bedrooms, bathrooms }
export async function listPropertiesApi(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(filters)) {
    if (val !== "" && val !== null && val !== undefined) {
      params.set(key, val);
    }
  }

  const url = params.toString()
    ? `${API_URL}/properties?${params.toString()}`
    : `${API_URL}/properties`;

  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load properties");
  return data.properties;
}


// ---------- GET /properties/:id  (single property detail) ----------
export async function getPropertyApi(propertyId) {
  const res = await fetch(`${API_URL}/properties/${propertyId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Property not found");
  return data.property;
}


// ---------- POST /properties (auth required) ----------
export async function createPropertyApi(propertyData) {
  const token = getToken();
  if (!token) throw new Error("You must be logged in");

  const res = await fetch(`${API_URL}/properties`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(propertyData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create property");
  return data.property;
}


// ---------- DELETE /properties/<id> (owner only) ----------
export async function deletePropertyApi(propertyId) {
  const token = getToken();
  if (!token) throw new Error("You must be logged in");

  const res = await fetch(`${API_URL}/properties/${propertyId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete");
  return data;
}


// ---------- POST /predict-house ----------
export async function predictHouseApi(payload) {
  const res = await fetch(`${API_URL}/predict-house`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Prediction failed");
  return data;
}


// ---------- POST /predict-land ----------
export async function predictLandApi(payload) {
  const res = await fetch(`${API_URL}/predict-land`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Prediction failed");
  return data;
}


// ---------- GET /analytics ----------
export async function getAnalyticsApi() {
  const res = await fetch(`${API_URL}/analytics`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load analytics");
  return data;
}
