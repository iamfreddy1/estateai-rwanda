// ============================================
// SHARED UTILITY FUNCTIONS
// ============================================

// Format an amount in RWF with thousands separators.
// Big values get abbreviated: 250,000,000 -> "250M RWF"
export function formatRWF(amount, { compact = false } = {}) {
  if (amount === null || amount === undefined || isNaN(amount)) return "-";
  const n = Number(amount);

  if (compact) {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B RWF`;
    if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M RWF`;
    if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}K RWF`;
    return `${n.toFixed(0)} RWF`;
  }

  return `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} RWF`;
}

// Format a rent price (per month)
export function formatRWFRent(amount) {
  return `${formatRWF(amount, { compact: true })}/mo`;
}
