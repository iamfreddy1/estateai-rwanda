// ============================================
// PROPERTY DETAILS PAGE
// ============================================
// Full-screen view of a single property: big image, all details, mini-map.

import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useOutletContext } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";

import { getPropertyApi, deletePropertyApi } from "../properties";
import { formatRWF, formatRWFRent } from "../utils";


function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useOutletContext();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPropertyApi(id)
      .then((p) => { if (!cancelled) setProperty(p); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  async function handleDelete() {
    if (!window.confirm(`Delete "${property.title}"? This can't be undone.`)) return;
    try {
      await deletePropertyApi(property.id);
      navigate("/buy");
    } catch (err) {
      alert(`Could not delete: ${err.message}`);
    }
  }

  // ---- Loading ----
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  // ---- Error / Not Found ----
  if (error || !property) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-md p-10 max-w-md text-center">
          <div className="text-5xl mb-3">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Property not found</h2>
          <p className="text-gray-600 mb-6">{error || "This listing may have been removed."}</p>
          <Link to="/buy" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition-colors">
            ← Back to Listings
          </Link>
        </div>
      </div>
    );
  }

  const isLand = property.property_type === "land";
  const isOwner = user && property.user_id === user.id;
  const priceDisplay = property.type === "rent"
    ? formatRWFRent(property.price)
    : formatRWF(property.price, { compact: true });

  // Custom marker icon for the mini map
  const markerIcon = L.divIcon({
    className: "custom-marker",
    html: `<div style="background:#2563eb;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });

  return (
    <div className="bg-gray-50 min-h-[80vh]">

      {/* HERO IMAGE */}
      <div className="relative h-[420px] w-full overflow-hidden bg-gray-300">
        <img
          src={property.image}
          alt={property.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1600";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-white/90 hover:bg-white text-gray-900 font-medium px-4 py-2 rounded-lg shadow"
        >
          ← Back
        </button>

        {/* Type badge */}
        <span className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-sm font-bold uppercase ${
          property.type === "rent" ? "bg-green-500 text-white"
          : isLand ? "bg-yellow-500 text-white"
          : "bg-blue-600 text-white"
        }`}>
          {isLand ? "Land" : `For ${property.type}`}
        </span>

        {/* Title overlay */}
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <h1 className="text-3xl md:text-5xl font-bold mb-1 drop-shadow-lg">{property.title}</h1>
          <p className="text-lg opacity-90 drop-shadow">📍 {property.sector}, {property.district}</p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN: details */}
        <div className="lg:col-span-2 space-y-6">

          {/* Price card */}
          <div className="bg-white rounded-2xl shadow-md p-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-gray-500 uppercase font-semibold tracking-wider">Price</p>
              <p className="text-4xl font-extrabold text-blue-600">{priceDisplay}</p>
              <p className="text-gray-500 text-sm">≈ {formatRWF(property.price)}</p>
            </div>
            {isOwner && (
              <button
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                🗑️ Delete Listing
              </button>
            )}
          </div>

          {/* Specs grid */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Property Features</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {!isLand && (
                <>
                  <Spec icon="🛏" label="Bedrooms" value={property.bedrooms} />
                  <Spec icon="🛁" label="Bathrooms" value={property.bathrooms} />
                  <Spec icon="📐" label="Size" value={property.size_sqft ? `${property.size_sqft.toLocaleString()} sqft` : null} />
                  <Spec icon="📅" label="Year Built" value={property.year_built} />
                  <Spec icon="🚗" label="Parking" value={property.parking != null ? `${property.parking} spots` : null} />
                  <Spec icon="🛋" label="Furnished" value={property.furnished ? "Yes" : "No"} />
                </>
              )}
              <Spec icon="🌳" label="Plot Size" value={property.land_size ? `${property.land_size.toLocaleString()} sqm` : null} />
              <Spec icon="🛣" label="Road Access" value={property.road_access} />
              <Spec icon="📍" label="Distance to City" value={property.proximity_to_city != null ? `${property.proximity_to_city} km` : null} />
              <Spec icon="🏘" label="Type" value={property.property_type} />
            </div>

            {/* Tags */}
            <div className="mt-5 flex flex-wrap gap-2">
              {property.modern_finish && (
                <span className="bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">✨ Modern finish</span>
              )}
              {property.furnished && (
                <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">🛋 Furnished</span>
              )}
              {property.road_access === "paved" && (
                <span className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">🛣 Paved access</span>
              )}
            </div>
          </div>

          {/* Location section */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📍 Location</h2>
            <p className="text-gray-700 mb-4">
              {property.sector}, {property.district} District, Kigali, Rwanda
            </p>
            {property.latitude && property.longitude ? (
              <div className="rounded-xl overflow-hidden border" style={{ height: 320 }}>
                <MapContainer
                  center={[property.latitude, property.longitude]}
                  zoom={15}
                  scrollWheelZoom={false}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[property.latitude, property.longitude]} icon={markerIcon} />
                </MapContainer>
              </div>
            ) : (
              <p className="text-gray-400 italic">No coordinates available for this listing.</p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-md p-6 sticky top-24">
            <h3 className="font-bold text-gray-900 mb-3">Listed by</h3>
            <p className="text-gray-700 mb-1">{property.owner_name || "EstateAI"}</p>
            <p className="text-xs text-gray-400 mb-4">
              {property.created_at ? `Posted ${new Date(property.created_at).toLocaleDateString()}` : ""}
            </p>

            {/* Call + WhatsApp + Contact buttons */}
            {property.owner_phone ? (
              <>
                <a
                  href={`tel:${property.owner_phone}`}
                  className="block text-center w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-lg transition-colors mb-2"
                >
                  📞 Call Seller
                </a>
                <a
                  href={`https://wa.me/${String(property.owner_phone).replace(/\D/g,"").replace(/^0/, "250")}?text=${encodeURIComponent(`Hi! I'm interested in your property "${property.title}" on EstateAI Rwanda.`)}`}
                  target="_blank" rel="noreferrer"
                  className="block text-center w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors mb-2"
                >
                  💬 WhatsApp Seller
                </a>
              </>
            ) : (
              <button disabled className="w-full bg-gray-300 text-gray-600 font-bold py-3 rounded-lg mb-2 cursor-not-allowed">
                📞 Seller phone unavailable
              </button>
            )}
            <Link
              to="/estimate-house"
              className="block text-center w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 rounded-lg transition-colors text-sm"
            >
              🤖 Get AI Valuation
            </Link>
          </div>

          {/* ============ PAYMENT INFORMATION ============ */}
          <PaymentInfoCard payment={property.payment} title={property.title} />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Payment Information card  (right sidebar)
// ============================================
function PaymentInfoCard({ payment, title }) {
  const pay = payment || {};
  const methods = pay.methods || [];

  // Flagged listings show a warning instead of details
  if (pay.flagged) {
    return (
      <div className="bg-red-50 border border-red-300 rounded-2xl shadow-md p-6">
        <h3 className="font-bold text-red-700 mb-2">⚠ Payment details disabled</h3>
        <p className="text-sm text-red-700">
          An admin has disabled this listing's payment information. Contact the seller directly to arrange payment.
        </p>
      </div>
    );
  }

  if (!methods.length || pay.show_payment_details === false) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h3 className="font-bold text-gray-900 mb-2">Payment Information</h3>
        <p className="text-sm italic text-gray-500">
          The seller has not published payment details. Contact them directly to arrange payment.
        </p>
      </div>
    );
  }

  function copy(t) {
    try { navigator.clipboard.writeText(String(t || "")); } catch {}
  }
  function copyAll() {
    const lines = [`Property: ${title}`, `Account Name: ${pay.account_holder_name || "-"}`];
    if (methods.includes("mtn") && pay.mtn_number)        lines.push(`MTN Mobile Money: ${pay.mtn_number}`);
    if (methods.includes("airtel") && pay.airtel_number)  lines.push(`Airtel Money: ${pay.airtel_number}`);
    if (methods.includes("bk") && pay.bk_account_number)  lines.push(`Bank of Kigali: ${pay.bk_account_number}`);
    if (methods.includes("equity") && pay.equity_account_number) lines.push(`Equity Bank: ${pay.equity_account_number}`);
    copy(lines.join("\n"));
  }

  const Row = ({ icon, label, value }) => value ? (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl">{icon}</span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">{label}</p>
          <p className="text-gray-900 font-bold truncate">{value}</p>
        </div>
      </div>
      <button onClick={() => copy(value)}
        className="text-xs font-bold text-blue-600 border border-blue-600 px-3 py-1 rounded hover:bg-blue-50 transition-colors flex-shrink-0">
        COPY
      </button>
    </div>
  ) : null;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h3 className="font-bold text-gray-900 mb-3">Payment Information</h3>
      <Row icon="👤" label="Account Name" value={pay.account_holder_name} />
      {methods.includes("mtn")    && <Row icon="🟡" label="MTN Mobile Money"   value={pay.mtn_number} />}
      {methods.includes("airtel") && <Row icon="🔴" label="Airtel Money"        value={pay.airtel_number} />}
      {methods.includes("bk")     && <Row icon="🏦" label="Bank of Kigali"      value={pay.bk_account_number} />}
      {methods.includes("equity") && <Row icon="🏦" label="Equity Bank Rwanda"  value={pay.equity_account_number} />}
      <button onClick={copyAll}
        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">
        📋 Copy All Payment Details
      </button>
    </div>
  );
}

function Spec({ icon, label, value }) {
  if (value == null || value === "" || value === undefined) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">{label}</p>
        <p className="text-gray-900 font-medium capitalize">{value}</p>
      </div>
    </div>
  );
}

export default PropertyDetails;
