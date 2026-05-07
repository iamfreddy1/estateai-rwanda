// ============================================
// PROPERTY CARD COMPONENT (Rwanda + Dark mode + Animation)
// ============================================

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { formatRWF, formatRWFRent } from "../utils";

function PropertyCard({ property, currentUserId, onDelete }) {
  const priceDisplay = property.type === "rent"
    ? formatRWFRent(property.price)
    : formatRWF(property.price, { compact: true });

  const isOwner = currentUserId && property.user_id === currentUserId;
  const isLand = property.property_type === "land";

  function handleDelete(e) {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Delete "${property.title}"? This can't be undone.`)) {
      onDelete(property.id);
    }
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        to={`/property/${property.id}`}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-md hover:shadow-xl dark:shadow-black/40 transition-shadow overflow-hidden block group relative border dark:border-gray-800"
      >
        <div className="relative h-52 overflow-hidden">
          <img
            src={property.image}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800";
            }}
          />

          <span
            className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold uppercase ${
              property.type === "rent"
                ? "bg-green-500 text-white"
                : isLand
                ? "bg-yellow-500 text-white"
                : "bg-blue-600 text-white"
            }`}
          >
            {isLand ? "Land" : `For ${property.type}`}
          </span>

          {!isLand && property.property_type && (
            <span className="absolute top-3 right-3 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 px-2.5 py-1 rounded-full text-xs font-semibold capitalize">
              {property.property_type}
            </span>
          )}

          {isOwner && (
            <button
              onClick={handleDelete}
              className="absolute bottom-3 right-3 bg-red-500 hover:bg-red-600 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
              title="Delete this listing"
            >
              🗑️
            </button>
          )}
        </div>

        <div className="p-5">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">{priceDisplay}</p>
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-1 line-clamp-1">{property.title}</p>

          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
            📍 {property.sector}
            {property.district && property.district !== property.sector && (
              <span className="text-gray-400 dark:text-gray-500">, {property.district}</span>
            )}
          </p>

          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm border-t dark:border-gray-800 pt-3 flex-wrap">
            {isLand ? (
              <>
                {property.land_size && <span>📐 {property.land_size.toLocaleString()} sqm</span>}
                {property.road_access && (
                  <span className={property.road_access === "paved" ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}>
                    🛣 {property.road_access}
                  </span>
                )}
              </>
            ) : (
              <>
                {property.bedrooms != null && <span>🛏 {property.bedrooms} bd</span>}
                {property.bathrooms != null && <span>🛁 {property.bathrooms} ba</span>}
                {property.size_sqft != null && <span>📐 {property.size_sqft.toLocaleString()} sqft</span>}
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {property.furnished && (
              <span className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded">furnished</span>
            )}
            {property.modern_finish && (
              <span className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded">modern</span>
            )}
            {property.parking > 0 && (
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5 rounded">🚗 {property.parking}</span>
            )}
          </div>

          {property.owner_name && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">Listed by {property.owner_name}</p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export default PropertyCard;
