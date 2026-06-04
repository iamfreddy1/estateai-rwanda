// ============================================
// PAYMENTS API CLIENT  (MTN MoMo + Airtel Money)
// ============================================
import client from "./client";

// POST /payments/contact-unlock  { property_id, phone, provider }
//   -> { payment: {...}, amount, currency }
export async function initContactUnlock({ propertyId, phone, provider }) {
  const r = await client.post("/payments/contact-unlock", {
    property_id: propertyId, phone, provider,
  });
  return r.data;
}

// POST /payments/premium  { phone, provider }
export async function initPremium({ phone, provider }) {
  const r = await client.post("/payments/premium", { phone, provider });
  return r.data;
}

// GET /payments/<id>/status   ->  { payment: {...}, provider_state }
export async function getPaymentStatus(payId) {
  const r = await client.get(`/payments/${payId}/status`);
  return r.data;
}

// GET /properties/<id>/contact   ->  { locked, name?, phone?, unlock_price_rwf? }
export async function getPropertyContact(propertyId) {
  const r = await client.get(`/properties/${propertyId}/contact`);
  return r.data;
}

// Convenience: poll until payment resolves (success | failed | timeout)
export async function pollUntilDone(payId, { intervalMs = 3000, timeoutMs = 90000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const { payment } = await getPaymentStatus(payId);
      if (payment.status === "success" || payment.status === "failed") return payment;
    } catch (_) { /* swallow + retry */ }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { status: "timeout", id: payId };
}
