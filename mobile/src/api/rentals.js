// ============================================
// RENTAL MARKETPLACE API HELPERS
// ============================================
import apiClient from "./client";

export async function browseRentals(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== "" && v !== null && v !== undefined && v !== false) params.set(k, v);
  });
  const { data } = await apiClient.get(`/rentals?${params}`);
  return data;     // { rentals, page, per_page, total }
}

export async function getRentalDetail(id) {
  const { data } = await apiClient.get(`/rentals/${id}`);
  return data.rental;
}

export async function setAvailability(id, availability) {
  const { data } = await apiClient.post(`/rentals/${id}/availability`, { availability });
  return data.property;
}

export async function inquireRental(id, payload) {
  // payload = { kind: "chat"|"viewing"|"call", message?, viewing_date? }
  const { data } = await apiClient.post(`/rentals/${id}/inquire`, payload);
  return data.inquiry;
}

export async function fetchRecommendedRentals() {
  const { data } = await apiClient.get("/rentals/recommend");
  return data;     // { rentals, basis, profile? }
}

export async function fetchLandlordInquiries(status) {
  const params = status ? `?status=${status}` : "";
  const { data } = await apiClient.get(`/landlord/inquiries${params}`);
  return data.inquiries || [];
}

export async function respondInquiry(iid, payload) {
  // payload = { action: "respond"|"dismiss"|"close", response? }
  const { data } = await apiClient.post(`/landlord/inquiries/${iid}/respond`, payload);
  return data.inquiry;
}

export async function fetchLandlordStats() {
  const { data } = await apiClient.get("/landlord/stats");
  return data;     // { totals, by_availability, listings }
}

export async function fetchMyInquiries(status) {
  const params = status ? `?status=${status}` : "";
  const { data } = await apiClient.get(`/my-inquiries${params}`);
  return data.inquiries || [];
}


export async function fetchRecentlyViewedRentals() {
  const { data } = await apiClient.get("/rentals/recently-viewed");
  return data.rentals || [];
}
