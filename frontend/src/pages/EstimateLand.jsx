// ============================================
// AI LAND ESTIMATE PAGE (polished UI)
// ============================================
// Green-themed counterpart to EstimateHouse with land-specific fields.

import { useState } from "react";
import { motion } from "framer-motion";
import { predictLandApi } from "../properties";
import { formatRWF } from "../utils";
import AnimatedNumber from "../components/AnimatedNumber";
import {
  DISTRICTS,
  SECTORS_BY_DISTRICT,
  ROAD_ACCESS,
  SLOPES,
} from "../constants";
import { INPUT_CLASS, SELECT_CLASS, LABEL_CLASS, SELECT_CARET_STYLE } from "../formStyles";

// Land's "zone type" (not in original but mentioned in spec)
const ZONE_TYPES = ["Residential", "Commercial", "Mixed-use", "Agricultural"];


function EstimateLand() {
  // ---- Form state ----
  const [district, setDistrict] = useState("Gasabo");
  const [sector, setSector] = useState("Kacyiru");
  const [landSize, setLandSize] = useState(800);
  const [roadAccess, setRoadAccess] = useState("paved");
  const [proximityToCity, setProximityToCity] = useState(5);
  const [proximityToRoad, setProximityToRoad] = useState(50);
  const [slope, setSlope] = useState("flat");
  const [zoneType, setZoneType] = useState("Residential");
  const [utilities, setUtilities] = useState(true);
  const [titleDeed, setTitleDeed] = useState(true);

  // ---- UI state ----
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const sectorsForDistrict = SECTORS_BY_DISTRICT[district] || [];

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await predictLandApi({
        district,
        sector,
        land_size: Number(landSize),
        road_access: roadAccess,
        proximity_to_city: Number(proximityToCity),
        proximity_to_road: Number(proximityToRoad),
        slope,
        utilities: utilities ? 1 : 0,
        title_deed: titleDeed ? 1 : 0,
        zone_type: zoneType,  // backend will ignore unknown but it's there for future use
      });
      setResult(data);
      setTimeout(() => {
        document.getElementById("result-area")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function confidenceColor(conf) {
    if (conf >= 90) return "text-green-600 dark:text-green-400";
    if (conf >= 75) return "text-emerald-600 dark:text-emerald-400";
    if (conf >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  }

  function confidenceBarColor(conf) {
    if (conf >= 90) return "bg-green-500";
    if (conf >= 75) return "bg-emerald-500";
    if (conf >= 60) return "bg-yellow-500";
    return "bg-orange-500";
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-[80vh]">

      {/* ===== ANIMATED HERO ===== */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800 py-16 px-6 text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-emerald-300/20 rounded-full blur-3xl"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative max-w-3xl mx-auto"
        >
          <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-4 border border-white/30">
            🤖 AI Powered · 🇷🇼 Kigali
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4 leading-tight drop-shadow-md">
            AI Land Price Estimator
          </h1>
          <p className="text-lg sm:text-xl text-green-50 max-w-2xl mx-auto leading-relaxed">
            Get an instant valuation for your Kigali plot. <strong className="text-yellow-300">Slope, road access, &amp; title deed</strong> all matter.
          </p>
        </motion.div>
      </div>

      {/* ===== MAIN GRID ===== */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* ===== FORM (3 cols) ===== */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow border border-gray-200 dark:border-gray-800 p-6 sm:p-8 space-y-6"
        >
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Land Details
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Land valuation depends on size, terrain, and accessibility.
            </p>
          </div>

          {/* ----- Location ----- */}
          <Section title="📍 Location">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="District">
                <select
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    setSector(SECTORS_BY_DISTRICT[e.target.value][0]);
                  }}
                  className={SELECT_CLASS}
                  style={SELECT_CARET_STYLE}
                >
                  {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Sector">
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className={SELECT_CLASS}
                  style={SELECT_CARET_STYLE}
                >
                  {sectorsForDistrict.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          {/* ----- Plot ----- */}
          <Section title="📐 Plot Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Plot Size (sqm)">
                <input type="number" min="0" value={landSize}
                  onChange={(e) => setLandSize(e.target.value)}
                  placeholder="e.g. 800" className={INPUT_CLASS} />
              </Field>
              <Field label="Slope / Terrain">
                <select value={slope} onChange={(e) => setSlope(e.target.value)}
                  className={SELECT_CLASS + " capitalize"}
                  style={SELECT_CARET_STYLE}
                >
                  {SLOPES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Zone Type">
              <select value={zoneType}
                onChange={(e) => setZoneType(e.target.value)}
                className={SELECT_CLASS}
                style={SELECT_CARET_STYLE}
              >
                {ZONE_TYPES.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </Field>
          </Section>

          {/* ----- Access ----- */}
          <Section title="🛣 Access">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Road Access">
                <select value={roadAccess}
                  onChange={(e) => setRoadAccess(e.target.value)}
                  className={SELECT_CLASS + " capitalize"}
                  style={SELECT_CARET_STYLE}
                >
                  {ROAD_ACCESS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Distance to Main Road (m)">
                <input type="number" min="0" max="2000"
                  value={proximityToRoad}
                  onChange={(e) => setProximityToRoad(e.target.value)}
                  placeholder="50" className={INPUT_CLASS} />
              </Field>
            </div>

            <Field label="Distance to City Center (km)">
              <input type="number" min="0" max="50"
                value={proximityToCity}
                onChange={(e) => setProximityToCity(e.target.value)}
                placeholder="5" className={INPUT_CLASS} />
            </Field>
          </Section>

          {/* ----- Quality ----- */}
          <Section title="✨ Status & Utilities">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ToggleField label="⚡ Utilities nearby" checked={utilities} onChange={setUtilities} />
              <ToggleField label="📜 Clear title deed" checked={titleDeed} onChange={setTitleDeed} />
            </div>
          </Section>

          {/* ----- Submit ----- */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 active:from-green-800 active:to-emerald-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 text-base"
          >
            {loading ? (
              <>
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Estimating...
              </>
            ) : "Estimate Land Price 🚀"}
          </button>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950/40 rounded-lg p-4"
            >
              <p className="text-red-800 dark:text-red-200 text-sm font-semibold">⚠️ {error}</p>
            </motion.div>
          )}
        </motion.form>

        {/* ===== RESULT (2 cols) ===== */}
        <div id="result-area" className="lg:col-span-2 space-y-4">

          {!result && !loading && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 text-center sticky top-24"
            >
              <div className="text-6xl mb-3">🌳</div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">Ready to estimate</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Fill in the land details on the left to get an AI valuation.
              </p>
            </motion.div>
          )}

          {loading && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 sticky top-24">
              <div className="space-y-3">
                <div className="h-4 w-1/3 shimmer rounded" />
                <div className="h-12 shimmer rounded" />
                <div className="h-3 shimmer rounded" />
                <div className="h-3 shimmer rounded w-2/3" />
              </div>
            </div>
          )}

          {result && !loading && (
            <motion.div
              key={result.predicted_price}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-t-4 border-green-600 p-6 sticky top-24"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">💰</span>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Estimated Value
                </p>
              </div>

              <p className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-1 tabular-nums">
                <AnimatedNumber
                  value={result.predicted_price}
                  format={(n) => formatRWF(n, { compact: true })}
                />
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                ≈ {formatRWF(result.predicted_price)}
              </p>

              {/* Per-sqm pill */}
              {result.price_per_sqm && (
                <div className="inline-block bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 text-sm font-bold px-3 py-1 rounded-full mb-4 border border-green-200 dark:border-green-800">
                  📏 {formatRWF(result.price_per_sqm, { compact: true }).replace(" RWF", "")} / sqm
                </div>
              )}

              {/* Confidence */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 mb-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    🎯 AI Confidence
                  </span>
                  <span className={`font-bold text-base ${confidenceColor(result.confidence)}`}>
                    {result.confidence}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.confidence}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${confidenceBarColor(result.confidence)}`}
                  />
                </div>
              </div>

              {/* Explanation */}
              <div className="bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold text-green-900 dark:text-green-200 uppercase tracking-wide mb-1.5">
                  📝 Valuation Rationale
                </p>
                <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
                  {result.explanation}
                </p>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                Generated by {result.model}
              </p>

              <button
                onClick={() => setResult(null)}
                className="mt-3 w-full text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold border-t border-gray-200 dark:border-gray-800 pt-3 transition-colors"
              >
                ← Try another estimate
              </button>
            </motion.div>
          )}

          {/* Tip card */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 text-sm text-amber-900 dark:text-amber-200">
            <p className="font-bold mb-2">💡 Land insights</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Paved road access can <strong>boost value 30-40%</strong></li>
              <li>Steep slopes <strong>cut value ~20%</strong> due to construction cost</li>
              <li>No clear title? Expect a <strong>25% discount</strong></li>
              <li>Closer to main road = higher value</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


// ---------- Sub-components ----------
function Section({ title, children }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-l-4 border-green-500 pl-3">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className={LABEL_CLASS}>{label}</label>
      {children}
    </div>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className={`flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl border transition-all duration-200 ${
      checked
        ? "bg-green-50 dark:bg-green-950/40 border-green-500 dark:border-green-600 shadow-sm"
        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
    }`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-green-600 cursor-pointer"
      />
      <span className={`text-sm font-semibold ${
        checked ? "text-green-900 dark:text-green-200" : "text-gray-900 dark:text-gray-100"
      }`}>
        {label}
      </span>
    </label>
  );
}

export default EstimateLand;
