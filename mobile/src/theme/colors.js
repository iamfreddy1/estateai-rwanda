// ============================================
// COLOR PALETTE (light + dark variants)
// ============================================
// Used by every screen. Switch by reading useColorScheme() from React Native.

export const lightColors = {
  // Brand
  primary:       "#2563eb",   // EstateAI blue
  primaryDark:   "#1d4ed8",
  accent:        "#16a34a",   // green for rent / land / success
  accentLand:    "#eab308",   // yellow for land
  warning:       "#f59e0b",
  danger:        "#dc2626",

  // Backgrounds
  background:    "#f9fafb",
  card:          "#ffffff",
  cardAlt:       "#f3f4f6",

  // Text
  text:          "#111827",
  textSecondary: "#4b5563",
  textMuted:     "#9ca3af",

  // Borders
  border:        "#e5e7eb",
  borderStrong:  "#d1d5db",

  // States
  success:       "#10b981",
  info:          "#3b82f6",
};

export const darkColors = {
  primary:       "#3b82f6",
  primaryDark:   "#2563eb",
  accent:        "#22c55e",
  accentLand:    "#facc15",
  warning:       "#fbbf24",
  danger:        "#f87171",

  background:    "#0b1020",
  card:          "#111827",
  cardAlt:       "#1f2937",

  text:          "#f9fafb",
  textSecondary: "#d1d5db",
  textMuted:     "#9ca3af",

  border:        "#374151",
  borderStrong:  "#4b5563",

  success:       "#10b981",
  info:          "#60a5fa",
};

// Helper: get the right palette for the current scheme
export function getColors(scheme) {
  return scheme === "dark" ? darkColors : lightColors;
}

// Spacing scale (use multiples of 4)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Common border radii
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};
