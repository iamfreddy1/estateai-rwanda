// ============================================
// FILTER BAR COMPONENT
// ============================================
// Reusable filter UI for Buy / Rent pages.
// Receives filter values + setters from parent.

import { DISTRICTS, SECTORS_BY_DISTRICT, ALL_PROPERTY_TYPES } from "../constants";

function FilterBar({ filters, onChange, onClear, theme = "blue" }) {
  // Sectors available depend on selected district
  const availableSectors = filters.district
    ? SECTORS_BY_DISTRICT[filters.district] || []
    : Object.values(SECTORS_BY_DISTRICT).flat();

  function update(key, val) {
    const newFilters = { ...filters, [key]: val };
    // If district changes, reset sector
    if (key === "district") newFilters.sector = "";
    onChange(newFilters);
  }

  const ringColor = theme === "green"
    ? "focus:ring-green-500"
    : "focus:ring-blue-500";

  const btnColor = theme === "green"
    ? "bg-green-600 hover:bg-green-700"
    : "bg-blue-600 hover:bg-blue-700";

  const hasActiveFilters = Object.entries(filters).some(
    ([k, v]) => k !== "type" && v !== "" && v !== null && v !== undefined
  );

  return (
    <div className="bg-white border-b py-6 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

          {/* District */}
          <select
            value={filters.district || ""}
            onChange={(e) => update("district", e.target.value)}
            className={`border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${ringColor} bg-white text-sm`}
          >
            <option value="">All Districts</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Sector */}
          <select
            value={filters.sector || ""}
            onChange={(e) => update("sector", e.target.value)}
            className={`border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${ringColor} bg-white text-sm`}
          >
            <option value="">All Sectors</option>
            {availableSectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Property type */}
          <select
            value={filters.property_type || ""}
            onChange={(e) => update("property_type", e.target.value)}
            className={`border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${ringColor} bg-white text-sm`}
          >
            <option value="">Any Type</option>
            {ALL_PROPERTY_TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">{t}</option>
            ))}
          </select>

          {/* Min price (RWF) */}
          <input
            type="number"
            placeholder="Min price (RWF)"
            value={filters.min_price || ""}
            onChange={(e) => update("min_price", e.target.value)}
            className={`border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${ringColor} text-sm`}
          />

          {/* Max price */}
          <input
            type="number"
            placeholder="Max price (RWF)"
            value={filters.max_price || ""}
            onChange={(e) => update("max_price", e.target.value)}
            className={`border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${ringColor} text-sm`}
          />

          {/* Bedrooms */}
          <input
            type="number"
            min="0"
            placeholder="Min beds"
            value={filters.bedrooms || ""}
            onChange={(e) => update("bedrooms", e.target.value)}
            className={`border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${ringColor} text-sm`}
          />
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={onClear}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FilterBar;
