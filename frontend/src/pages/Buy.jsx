// ============================================
// BUY PAGE (Rwanda Edition + Map view)
// ============================================
// Lists Kigali properties with filters AND a map view.
// Three view modes: Grid / Split / Map

import { useEffect, useState, useMemo } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import PropertyGrid from "../components/PropertyGrid";
import PropertyMap from "../components/PropertyMap";
import FilterBar from "../components/FilterBar";
import ViewToggle from "../components/ViewToggle";
import { listPropertiesApi, deletePropertyApi } from "../properties";

function Buy() {
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
  const [view, setView] = useState("split");  // grid / split / map

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listPropertiesApi({ type: "buy", ...filtersFromUrl })
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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 py-12 px-6 text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
          Properties for Sale in Kigali 🏡
        </h1>
        <p className="text-blue-100">
          Browse {properties.length > 0 ? `${properties.length} ` : ""}homes &amp; land available to buy
        </p>
      </div>

      <FilterBar
        filters={filtersFromUrl}
        onChange={handleFilterChange}
        onClear={clearFilters}
        theme="blue"
      />

      {/* View toggle bar */}
      <div className="bg-white border-b py-3 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-gray-600 text-sm">
            {loading ? "Loading..." : `${properties.length} listings`}
          </span>
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      {/* Content - layout changes based on view mode */}
      <div className="max-w-7xl mx-auto px-6 py-6">

        {view === "grid" && (
          <PropertyGrid
            properties={properties}
            loading={loading}
            error={error}
            currentUserId={user?.id}
            onDelete={handleDelete}
            showHeader={false}
            emptyMessage="No properties match your filters. Try adjusting them. 🔍"
            wrap={false}
          />
        )}

        {view === "map" && (
          <PropertyMap properties={properties} height="700px" />
        )}

        {view === "split" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: scrollable list */}
            <div className="max-h-[700px] overflow-y-auto pr-2">
              <PropertyGrid
                properties={properties}
                loading={loading}
                error={error}
                currentUserId={user?.id}
                onDelete={handleDelete}
                showHeader={false}
                emptyMessage="No properties match your filters."
                compact
                wrap={false}
              />
            </div>
            {/* Right: sticky map */}
            <div className="hidden lg:block sticky top-24 h-[700px]">
              <PropertyMap properties={properties} height="700px" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Buy;
