// ============================================
// THEME HELPER (light / dark mode)
// ============================================
// Saves preference to localStorage and toggles the 'dark' class
// on the <html> element.

const STORAGE_KEY = "estateai_theme";

export function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEY);
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  const next = isDark ? "light" : "dark";
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme(next);
  return next;
}

// Initial setup - call once on app boot
export function initTheme() {
  // 1. respect explicit user choice
  const stored = getStoredTheme();
  if (stored === "dark" || stored === "light") {
    applyTheme(stored);
    return;
  }
  // 2. otherwise follow OS preference
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(prefersDark ? "dark" : "light");
}
