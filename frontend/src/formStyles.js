// ============================================
// SHARED FORM STYLE CONSTANTS
// ============================================
// Used by Sell, EstimateHouse, EstimateLand for a consistent look
// with proper contrast in both light AND dark mode.

export const INPUT_CLASS =
  "w-full bg-white dark:bg-gray-800 " +
  "text-gray-900 dark:text-gray-100 " +
  "placeholder-gray-500 dark:placeholder-gray-400 " +
  "border border-gray-300 dark:border-gray-700 rounded-xl " +
  "px-4 py-3 text-sm font-medium " +
  "shadow-sm " +
  "hover:border-gray-400 dark:hover:border-gray-600 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 " +
  "transition-all duration-200";

export const SELECT_CLASS = INPUT_CLASS + " appearance-none cursor-pointer pr-10";

export const LABEL_CLASS =
  "block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5";

// Dropdown caret SVG (positioned with absolute wrapper)
export const SELECT_CARET_STYLE = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.75rem center",
  backgroundSize: "1.25rem",
};
