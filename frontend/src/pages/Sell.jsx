// ============================================
// SELL PAGE (Rwanda Edition - Polished UI)
// ============================================
// Full-page form to create a Kigali property listing.
// High-contrast labels, dark text inputs, proper dark-mode support,
// section grouping, focus rings, hover states, responsive layout.

import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { createPropertyApi } from "../properties";
import {
  DISTRICTS,
  SECTORS_BY_DISTRICT,
  PROPERTY_TYPES_HOUSE,
  ROAD_ACCESS,
} from "../constants";


// ============================================
// SHARED INPUT CLASSES (high contrast, dark-mode aware)
// ============================================
const INPUT_CLASS =
  "w-full bg-white dark:bg-gray-800 " +
  "text-gray-900 dark:text-gray-100 " +
  "placeholder-gray-500 dark:placeholder-gray-400 " +
  "border border-gray-300 dark:border-gray-700 rounded-lg " +
  "px-4 py-2.5 text-sm font-medium " +
  "shadow-sm " +
  "hover:border-gray-400 dark:hover:border-gray-600 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 " +
  "transition-colors";

const SELECT_CLASS = INPUT_CLASS + " appearance-none bg-no-repeat";

const LABEL_CLASS =
  "block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5";


// ============================================
// SELL COMPONENT
// ============================================
function Sell() {
  const { user, openLogin } = useOutletContext();
  const navigate = useNavigate();

  const [listingKind, setListingKind] = useState("house");

  // Common
  const [title, setTitle] = useState("");
  const [type, setType] = useState("buy");
  const [propertyType, setPropertyType] = useState("house");
  const [district, setDistrict] = useState("Gasabo");
  const [sector, setSector] = useState("Kacyiru");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");

  // House-only
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [sizeSqft, setSizeSqft] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [furnished, setFurnished] = useState(false);
  const [parking, setParking] = useState(0);
  const [modernFinish, setModernFinish] = useState(false);

  // Land / shared
  const [landSize, setLandSize] = useState("");
  const [roadAccess, setRoadAccess] = useState("paved");
  const [proximityToCity, setProximityToCity] = useState("");

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const sectorsForDistrict = SECTORS_BY_DISTRICT[district] || [];

  function reset() {
    setTitle(""); setPrice("");
    setBedrooms(""); setBathrooms(""); setSizeSqft("");
    setYearBuilt(""); setFurnished(false); setParking(0); setModernFinish(false);
    setLandSize(""); setRoadAccess("paved"); setProximityToCity(""); setImage("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const payload = {
      title: title.trim(),
      type,
      currency: "RWF",
      property_type: listingKind === "land" ? "land" : propertyType,
      district,
      sector,
      price: Number(price),
      image: image.trim(),
      road_access: roadAccess,
      proximity_to_city: proximityToCity ? Number(proximityToCity) : null,
    };
    if (listingKind === "house") {
      payload.bedrooms      = bedrooms ? Number(bedrooms) : null;
      payload.bathrooms     = bathrooms ? Number(bathrooms) : null;
      payload.size_sqft     = sizeSqft ? Number(sizeSqft) : null;
      payload.year_built    = yearBuilt ? Number(yearBuilt) : null;
      payload.furnished     = furnished;
      payload.parking       = Number(parking) || 0;
      payload.modern_finish = modernFinish;
      payload.land_size     = landSize ? Number(landSize) : null;
    } else {
      payload.land_size = landSize ? Number(landSize) : null;
    }

    setLoading(true);
    try {
      const newProp = await createPropertyApi(payload);
      setSuccess(`✅ "${newProp.title}" listed successfully!`);
      reset();
      setTimeout(() => navigate(type === "rent" ? "/rent" : "/buy"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ---- Logged-out gate ----
  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6 py-16 bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-10 max-w-md text-center border dark:border-gray-800">
          <div className="text-5xl mb-3">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Login required
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You need to be logged in to list a property.
          </p>
          <button
            onClick={openLogin}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            Login to continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-[80vh] py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">

        {/* PAGE HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
            List Your Property 📝
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Add a new Kigali listing to the marketplace.
          </p>
        </div>

        {/* FORM CONTAINER */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">

          {/* House / Land toggle */}
          <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 p-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setListingKind("house"); setPropertyType("house"); }}
                className={`flex-1 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                  listingKind === "house"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
                }`}
              >
                🏠 House / Apartment
              </button>
              <button
                type="button"
                onClick={() => setListingKind("land")}
                className={`flex-1 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                  listingKind === "land"
                    ? "bg-yellow-500 text-white shadow-md"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
                }`}
              >
                🌳 Land
              </button>
            </div>
          </div>

          {/* BANNERS */}
          {success && (
            <div className="m-6 mb-0 p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950/40 rounded-lg">
              <p className="text-green-800 dark:text-green-200 font-semibold">{success}</p>
              <p className="text-green-700 dark:text-green-300 text-sm mt-1">Redirecting...</p>
            </div>
          )}
          {error && (
            <div className="m-6 mb-0 p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-950/40 rounded-lg">
              <p className="text-red-800 dark:text-red-200 font-semibold">⚠️ {error}</p>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">

            {/* ===== Section 1: Basics ===== */}
            <Section title="Basic Info" subtitle="What are you listing?">
              <Field label="Title">
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    listingKind === "land"
                      ? "e.g. 800 sqm plot in Kimihurura"
                      : "e.g. Modern villa in Nyarutarama"
                  }
                  className={INPUT_CLASS}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {listingKind === "house" ? (
                  <Field label="Property Type">
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className={SELECT_CLASS + " capitalize"}
                    >
                      {PROPERTY_TYPES_HOUSE.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <div className="hidden sm:block" />
                )}

                <Field label="Listing Type">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="buy">For Sale</option>
                    {listingKind === "house" && <option value="rent">For Rent</option>}
                  </select>
                </Field>
              </div>

              <Field label="Price (RWF)">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 150000000"
                    className={INPUT_CLASS + " pr-16"}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500 dark:text-gray-400 pointer-events-none">
                    RWF
                  </span>
                </div>
                {price && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    ≈ {Number(price).toLocaleString("en-US")} RWF
                  </p>
                )}
              </Field>
            </Section>

            {/* ===== Section 2: Location ===== */}
            <Section title="Location" subtitle="Where in Kigali is it?">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="District">
                  <select
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setSector(SECTORS_BY_DISTRICT[e.target.value][0]);
                    }}
                    className={SELECT_CLASS}
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Sector">
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    {sectorsForDistrict.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Distance to city center (km)">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={proximityToCity}
                  onChange={(e) => setProximityToCity(e.target.value)}
                  placeholder="e.g. 5"
                  className={INPUT_CLASS}
                />
              </Field>
            </Section>

            {/* ===== Section 3: Details (house only) ===== */}
            {listingKind === "house" && (
              <Section title="Property Details" subtitle="Specs and features">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Bedrooms">
                    <input type="number" min="0" max="20" value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value)}
                      placeholder="3" className={INPUT_CLASS} />
                  </Field>
                  <Field label="Bathrooms">
                    <input type="number" min="0" max="20" value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value)}
                      placeholder="2" className={INPUT_CLASS} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Size (sqft)">
                    <input type="number" min="0" value={sizeSqft}
                      onChange={(e) => setSizeSqft(e.target.value)}
                      placeholder="1500" className={INPUT_CLASS} />
                  </Field>
                  <Field label="Year built">
                    <input type="number" min="1900" max="2030" value={yearBuilt}
                      onChange={(e) => setYearBuilt(e.target.value)}
                      placeholder="e.g. 2020" className={INPUT_CLASS} />
                  </Field>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <ToggleField
                    label="Furnished"
                    checked={furnished}
                    onChange={setFurnished}
                  />
                  <ToggleField
                    label="Modern finish"
                    checked={modernFinish}
                    onChange={setModernFinish}
                  />
                  <Field label="Parking spots">
                    <input type="number" min="0" max="10" value={parking}
                      onChange={(e) => setParking(e.target.value)}
                      className={INPUT_CLASS} />
                  </Field>
                </div>
              </Section>
            )}

            {/* ===== Section 4: Land ===== */}
            <Section
              title={listingKind === "land" ? "Land Details" : "Plot & Access"}
              subtitle={listingKind === "land" ? "Land specifics" : "Plot info and road access"}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={listingKind === "land" ? "Land size (sqm)" : "Plot size (sqm)"}>
                  <input type="number" min="0" value={landSize}
                    onChange={(e) => setLandSize(e.target.value)}
                    placeholder="e.g. 500" className={INPUT_CLASS} />
                </Field>
                <Field label="Road access">
                  <select value={roadAccess}
                    onChange={(e) => setRoadAccess(e.target.value)}
                    className={SELECT_CLASS + " capitalize"}>
                    {ROAD_ACCESS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>

            {/* ===== Section 5: Image ===== */}
            <Section title="Photo" subtitle="Optional — paste a URL">
              <Field label="Image URL">
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className={INPUT_CLASS}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Leave blank to use a default image.
                </p>
              </Field>
            </Section>

            {/* ===== Submit ===== */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white font-bold py-3.5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Publishing...
                  </>
                ) : "Publish Listing 🚀"}
              </button>
              <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
                By listing, you agree to EstateAI's terms.
              </p>
            </div>

          </form>
        </div>

        {/* Tip card below form */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-4 text-sm text-blue-900 dark:text-blue-200">
          <p className="font-semibold mb-1">💡 Quick tip</p>
          <p>
            Premium sectors like <strong>Nyarutarama</strong> and <strong>Kimihurura</strong> command higher prices.
            Modern finishes &amp; paved road access typically add ~10% to the value.
          </p>
        </div>
      </div>
    </div>
  );
}


// ============================================
// SUB-COMPONENTS
// ============================================

// Section wrapper with a title header
function Section({ title, subtitle, children }) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

// Standard label + child wrapper
function Field({ label, children }) {
  return (
    <div>
      <label className={LABEL_CLASS}>{label}</label>
      {children}
    </div>
  );
}

// Pretty boolean toggle (checkbox styled as a card)
function ToggleField({ label, checked, onChange }) {
  return (
    <label className={`
      flex items-center gap-3 cursor-pointer
      px-4 py-2.5 rounded-lg border transition-colors
      ${checked
        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 dark:border-blue-600"
        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"}
    `}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-blue-600 cursor-pointer"
      />
      <span className={`text-sm font-semibold ${
        checked
          ? "text-blue-900 dark:text-blue-200"
          : "text-gray-900 dark:text-gray-100"
      }`}>
        {label}
      </span>
    </label>
  );
}

export default Sell;
