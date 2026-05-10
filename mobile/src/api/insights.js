// ============================================
// AI INSIGHTS API
// ============================================
// Wraps /insights/* endpoints + view tracking.

import apiClient from "./client";

// Track that a property detail page was opened.
// Fire-and-forget - we don't block UI on this.
export async function trackViewApi(propertyId) {
  try {
    await apiClient.post(`/properties/${propertyId}/view`);
  } catch {
    // silent
  }
}

// Market-wide stats (avg by sector/district, growing sectors, etc.)
export async function getTrendsApi() {
  const res = await apiClient.get("/insights/trends");
  return res.data;
}

// Most-viewed properties
export async function getTrendingApi({ days = 7, limit = 10 } = {}) {
  const res = await apiClient.get("/insights/trending", { params: { days, limit } });
  return res.data;            // { properties, count }
}

// Personalized "You might like" recs (auth required)
export async function getRecommendationsApi(limit = 8) {
  const res = await apiClient.get("/insights/recommendations", { params: { limit } });
  return res.data;            // { strategy, properties, profile }
}
