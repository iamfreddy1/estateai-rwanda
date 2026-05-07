// ============================================
// RENT PAGE (Rwanda Edition)
// ============================================
// Same as Buy but filtered to type=rent and green-themed.

import { useEffect, useState, useMemo } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import PropertyGrid from "../components/PropertyGrid";
import FilterBar from "../components/FilterBar";
import { listPropertiesApi, deletePropertyApi } from "../properties";

function Rent() {
  const { user } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const filtersFromUrl = useMemo(() => ({
    district:      searchParams.get("district") || "",
    sector:        searchParams.get("sector") || "",
    property_type: searchParams.get("property_type") || "",
    min_price:     searchParams.get("min_price") || "",
    max_price:     searchParams.get("max_price") || "",
    bedrooms:      searchParams.get("bedrooms") || "",
    location:      searchParams.get("location") || "",
  }), [searchParams]);

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listPropertiesApi({ type: "rent", ...filtersFromUrl })
      .then((props) => { if (!cancelled) setProperties(props); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [filtersFromUrl]);

  function handleFilterChange(newFilters) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(newFilters)) {
      if (v) params.set(k, v);
    }
    setSearchParams(params);
  }

  function clearFilters() { setSearchParams({}); }

  async function handleDelete(propertyId) {
    try {
      await deletePropertyApi(propertyId);
      setProperties((prev) => prev.filter((p) => p.id !== propertyId));
    } catch (err) {
      alert(`Could not delete: ${err.message}`);
    }
  }

  return (
    <div className="bg-gray-50 min-h-[80vh]">
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 py-12 px-6 text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
          Rentals in Kigali 🔑
        </h1>
        <p className="text-green-100">
          {properties.length > 0 ? `${properties.length} ` : ""}properties available to rent
        </p>
      </div>

      <FilterBar
        filters={filtersFromUrl}
        onChange={handleFilterChange}
        onClear={clearFilters}
        theme="green"
      />

      <PropertyGrid
        properties={properties}
        loading={loading}
        error={error}
        currentUserId={user?.id}
        onDelete={handleDelete}
        showHeader={false}
        emptyMessage="No rentals match your filters. Try adjusting them. 🔍"
      />
    </div>
  );
}

export default Rent;
