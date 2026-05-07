// ============================================
// PROPERTY MAP COMPONENT (Leaflet)
// ============================================
// Renders an OpenStreetMap with markers for each property.
// Color-coded by type: blue=buy, green=rent, yellow=land.
// Clicking a marker opens a popup with image + price + detail link.

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { formatRWF, formatRWFRent } from "../utils";

// Kigali city center coordinates
const KIGALI_CENTER = [-1.9536, 30.0606];
const DEFAULT_ZOOM = 12;


// ============================================
// CUSTOM COLORED MARKER ICONS
// ============================================
// Leaflet's default marker uses image files we don't have - we use HTML icons
// shaped like teardrops and colored per category.
function makeIcon(color) {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        display:flex;align-items:center;justify-content:center;">
        <div style="
          background:white;width:10px;height:10px;border-radius:50%;
          transform: rotate(45deg);"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });
}

const ICONS = {
  buy:  makeIcon("#2563eb"),  // blue
  rent: makeIcon("#16a34a"),  // green
  land: makeIcon("#eab308"),  // yellow
};

function getIconFor(property) {
  if (property.property_type === "land") return ICONS.land;
  if (property.type === "rent") return ICONS.rent;
  return ICONS.buy;
}


// ============================================
// AUTO-FIT VIEW HELPER
// ============================================
// When properties change, fit the map view to show all markers.
function FitBounds({ properties }) {
  const map = useMap();

  useEffect(() => {
    const points = properties
      .filter((p) => p.latitude && p.longitude)
      .map((p) => [p.latitude, p.longitude]);

    if (points.length > 0) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
    } else {
      map.setView(KIGALI_CENTER, DEFAULT_ZOOM);
    }
  }, [properties, map]);

  return null;
}


// ============================================
// MAIN MAP COMPONENT
// ============================================
function PropertyMap({ properties = [], height = "500px" }) {
  // Filter out properties without coordinates
  const mappable = properties.filter((p) => p.latitude && p.longitude);

  return (
    <div className="rounded-xl overflow-hidden shadow-md border border-gray-200" style={{ height }}>
      <MapContainer
        center={KIGALI_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        {/* OpenStreetMap tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-fit to show all markers */}
        <FitBounds properties={mappable} />

        {/* Property markers */}
        {mappable.map((p) => (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={getIconFor(p)}
          >
            <Popup>
              <div className="w-56">
                <img
                  src={p.image}
                  alt={p.title}
                  className="w-full h-28 object-cover rounded-md mb-2"
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400";
                  }}
                />
                <p className="font-bold text-base text-gray-900 mb-0.5">
                  {p.type === "rent" ? formatRWFRent(p.price) : formatRWF(p.price, { compact: true })}
                </p>
                <p className="text-sm text-gray-700 mb-1 line-clamp-1">{p.title}</p>
                <p className="text-xs text-gray-500 mb-2">
                  📍 {p.sector}, {p.district}
                </p>

                {/* Specs */}
                <div className="text-xs text-gray-600 flex gap-2 mb-2 flex-wrap">
                  {p.property_type === "land" ? (
                    <>{p.land_size && <span>📐 {p.land_size} sqm</span>}</>
                  ) : (
                    <>
                      {p.bedrooms != null && <span>🛏 {p.bedrooms}</span>}
                      {p.bathrooms != null && <span>🛁 {p.bathrooms}</span>}
                      {p.size_sqft != null && <span>📐 {p.size_sqft} sqft</span>}
                    </>
                  )}
                </div>

                <Link
                  to={`/property/${p.id}`}
                  className="block bg-blue-600 hover:bg-blue-700 text-white text-center text-sm font-semibold py-1.5 rounded-md transition-colors"
                >
                  View Details →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend overlay */}
      <div className="absolute bottom-3 left-3 bg-white/95 rounded-lg shadow px-3 py-2 text-xs space-y-1 z-[400]"
           style={{ position: "relative", marginTop: "-60px", marginLeft: "12px", width: "fit-content" }}>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span><span>For Sale</span></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-600 inline-block"></span><span>For Rent</span></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span><span>Land</span></div>
      </div>
    </div>
  );
}

export default PropertyMap;
