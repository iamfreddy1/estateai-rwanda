// ============================================
// PROPERTY LIST COMPONENT (reusable)
// ============================================
// Shows a grid of properties with proper loading/error/empty states.
// Used by Home, Buy, and Rent pages.

import PropertyCard from "./PropertyCard";

function PropertyList({ properties, loading, error, currentUserId, onDelete, emptyMessage }) {
  // ---- LOADING ----
  if (loading) {
    return (
      <div className="text-center py-12">
        <span className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
        <p className="text-gray-500 mt-4">Loading properties...</p>
      </div>
    );
  }

  // ---- ERROR ----
  if (error) {
    return (
      <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-700">⚠️ {error}</p>
        <p className="text-red-500 text-sm mt-1">
          Make sure the Flask backend is running on port 5000.
        </p>
      </div>
    );
  }

  // ---- EMPTY ----
  if (!properties || properties.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          {emptyMessage || "No properties found 🏡"}
        </p>
      </div>
    );
  }

  // ---- LIST ----
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          currentUserId={currentUserId}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default PropertyList;
