// ============================================
// PREDICTIONS API
// ============================================
// Wraps /predict-house and /predict-land endpoints.

import apiClient from "./client";

export async function predictHouseApi(payload) {
  const res = await apiClient.post("/predict-house", payload);
  return res.data;
}

export async function predictLandApi(payload) {
  const res = await apiClient.post("/predict-land", payload);
  return res.data;
}
