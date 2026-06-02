// ============================================
// PROPERTIES API
// ============================================
// Wraps /properties endpoints from your Flask backend.

import apiClient from "./client";

// GET /properties (with optional filters)
// filters: { type, property_type, district, sector, location, min_price, max_price, bedrooms }
export async function listPropertiesApi(filters = {}) {
  const params = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v !== "" && v !== null && v !== undefined) params[k] = v;
  }
  const res = await apiClient.get("/properties", { params });
  return res.data.properties;
}

// GET /properties/:id
export async function getPropertyApi(id) {
  const res = await apiClient.get(`/properties/${id}`);
  return res.data.property;
}

// POST /properties (auth required)
export async function createPropertyApi(payload) {
  const res = await apiClient.post("/properties", payload);
  return res.data.property;
}

// DELETE /properties/:id (owner only)
export async function deletePropertyApi(id) {
  const res = await apiClient.delete(`/properties/${id}`);
  return res.data;
}

// GET /analytics
export async function getAnalyticsApi() {
  const res = await apiClient.get("/analytics");
  return res.data;
}

// Attach an ownership document URL to a property (re-submits to pending).
export async function attachOwnershipDocApi(propertyId, docUrl) {
  const res = await apiClient.post(`/properties/${propertyId}/ownership`, {
    ownership_doc_url: docUrl,
  });
  return res.data.property;
}

// Refresh the user's auth context after server-side changes.
export async function getMyListingsApi() {
  const res = await apiClient.get("/properties?status=mine");
  return res.data.properties;
}

// Admin actions
export async function adminApprovePropertyApi(propertyId) {
  const res = await apiClient.post(`/properties/${propertyId}/approve`);
  return res.data.property;
}

export async function adminRejectPropertyApi(propertyId, reason) {
  const res = await apiClient.post(`/properties/${propertyId}/reject`, { reason });
  return res.data.property;
}


// ---------- PUT /properties/<id> (owner or admin) ----------
export async function updatePropertyApi(id, payload) {
  const { data } = await apiClient.put(`/properties/${id}`, payload);
  return data;     // { property, changed }
}

// ---------- GET /properties/<id>/similar ----------
export async function getSimilarPropertiesApi(id) {
  const { data } = await apiClient.get(`/properties/${id}/similar`);
  return data.similar || [];
}
