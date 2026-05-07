// ============================================
// PROPERTY GRID COMPONENT (with skeleton + dark mode)
// ============================================

import PropertyCard from "./PropertyCard";
import PropertySkeleton from "./PropertySkeleton";

function PropertyGrid({
  properties,
  loading,
  error,
  currentUserId,
  onDelete,
  showHeader = true,
  title = "Featured Properties",
  subtitle = "Live listings from our database",
  emptyMessage = "No listings found 🏡",
  compact = false,
  wrap = true,
}) {
  const gridCols = compact
    ? "grid-cols-1 xl:grid-cols-2"
    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  const inner = (
    <>
      {showHeader && (
        <div className="mb-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h2>
          <p className="text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>
      )}

      {loading && <PropertySkeleton count={compact ? 4 : 6} compact={compact} />}

      {error && !loading && (
        <div className="max-w-md mx-auto bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg p-4 text-center">
          <p className="text-red-700 dark:text-red-300">⚠️ {error}</p>
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">
            Make sure the Flask backend is running on port 5000.
          </p>
        </div>
      )}

      {!loading && !error && properties.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">{emptyMessage}</p>
        </div>
      )}

      {!loading && !error && properties.length > 0 && (
        <div className={`grid ${gridCols} gap-5`}>
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              currentUserId={currentUserId}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </>
  );

  if (!wrap) return inner;

  return (
    <section className="py-16 px-6 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto">{inner}</div>
    </section>
  );
}

export default PropertyGrid;
