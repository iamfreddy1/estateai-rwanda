// ============================================
// PREDICT MODAL COMPONENT
// ============================================
// A popup form that lets users enter property details and
// get an AI-predicted price from the Flask /predict endpoint.

import { useState } from "react";

// Available locations - must match the ones the AI was trained on!
const LOCATIONS = [
  "Downtown",
  "City Center",
  "Suburb",
  "Countryside",
  "Beachside",
  "Industrial",
];

function PredictModal({ isOpen, onClose }) {
  // ---------- STATE ----------
  // Form values - one piece of state per input field
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [sizeSqft, setSizeSqft] = useState(1500);
  const [location, setLocation] = useState("Downtown");
  const [age, setAge] = useState(5);

  // UI state
  const [loading, setLoading] = useState(false);   // true while API call in progress
  const [result, setResult] = useState(null);      // the predicted price
  const [error, setError] = useState(null);        // any error message

  // ---------- SUBMIT HANDLER ----------
  // Called when the user clicks "Estimate Price"
  async function handleSubmit(e) {
    e.preventDefault();  // prevent page reload (default form behavior)

    // Reset previous results / errors
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      // Call the Flask backend /predict endpoint
      const response = await fetch("http://localhost:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedrooms: Number(bedrooms),
          bathrooms: Number(bathrooms),
          size_sqft: Number(sizeSqft),
          location: location,
          age: Number(age),
        }),
      });

      // Parse the JSON response
      const data = await response.json();

      // Did the request succeed?
      if (!response.ok) {
        throw new Error(data.error || "Prediction failed");
      }

      // Save the prediction to state (this triggers a re-render)
      setResult(data);
    } catch (err) {
      setError(err.message || "Could not reach the server. Is Flask running?");
    } finally {
      setLoading(false);
    }
  }

  // ---------- RESET HANDLER ----------
  function resetForm() {
    setResult(null);
    setError(null);
  }

  // If the modal isn't open, render nothing
  if (!isOpen) return null;

  // ---------- RENDER ----------
  return (
    // BACKDROP - semi-transparent black overlay
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}  // close when clicking outside
    >
      {/* MODAL BOX - stop click propagation so clicking inside doesn't close */}
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🤖 AI Price Estimate</h2>
            <p className="text-gray-500 text-sm">Enter property details below</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-3xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Bedrooms + Bathrooms - side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Bedrooms
              </label>
              <input
                type="number"
                min="0" max="20"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Bathrooms
              </label>
              <input
                type="number"
                min="0" max="20"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Size + Age - side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Size (sqft)
              </label>
              <input
                type="number"
                min="0"
                value={sizeSqft}
                onChange={(e) => setSizeSqft(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Age (years)
              </label>
              <input
                type="number"
                min="0" max="200"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Location dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Calculating...
              </>
            ) : (
              "Estimate Price 🚀"
            )}
          </button>
        </form>

        {/* RESULT AREA */}
        {result && (
          <div className="p-6 border-t bg-gradient-to-br from-blue-50 to-indigo-50">
            <p className="text-sm text-gray-600 mb-1">AI Predicted Price</p>
            <p className="text-4xl font-bold text-blue-600 mb-2">
              {result.predicted_price.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              })}
            </p>
            <p className="text-xs text-gray-500">{result.note}</p>
            <button
              onClick={resetForm}
              className="mt-3 text-blue-600 hover:underline text-sm font-medium"
            >
              ← Try another estimate
            </button>
          </div>
        )}

        {/* ERROR AREA */}
        {error && (
          <div className="p-4 m-6 mt-0 border border-red-200 bg-red-50 rounded-lg">
            <p className="text-red-700 text-sm font-medium">⚠️ {error}</p>
          </div>
        )}

      </div>
    </div>
  );
}

export default PredictModal;
