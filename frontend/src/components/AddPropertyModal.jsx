// ============================================
// ADD PROPERTY MODAL
// ============================================
// Form for logged-in users to create a new property listing.

import { useState } from "react";
import { createPropertyApi } from "../properties";

const LOCATIONS = [
  "Downtown",
  "City Center",
  "Suburb",
  "Countryside",
  "Beachside",
  "Industrial",
];

function AddPropertyModal({ isOpen, onClose, onCreated }) {
  // Form fields
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState(500000);
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [sizeSqft, setSizeSqft] = useState(1500);
  const [age, setAge] = useState(5);
  const [location, setLocation] = useState("Downtown");
  const [type, setType] = useState("buy");
  const [image, setImage] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function reset() {
    setTitle("");
    setPrice(500000);
    setBedrooms(3);
    setBathrooms(2);
    setSizeSqft(1500);
    setAge(5);
    setLocation("Downtown");
    setType("buy");
    setImage("");
    setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const newProp = await createPropertyApi({
        title,
        price: Number(price),
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        size_sqft: Number(sizeSqft),
        age: Number(age),
        location,
        type,
        image,
      });

      // Notify parent to refresh the listings
      onCreated(newProp);
      reset();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">➕ Add Listing</h2>
            <p className="text-gray-500 text-sm">Create a new property listing</p>
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

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Modern Downtown Loft"
              required
            />
          </div>

          {/* Price + Type side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Price (USD)
              </label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="buy">For Sale</option>
                <option value="rent">For Rent</option>
              </select>
            </div>
          </div>

          {/* Bedrooms + Bathrooms */}
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

          {/* Size + Age */}
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

          {/* Location */}
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

          {/* Image URL (optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Image URL (optional)
            </label>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://... (leave blank for default)"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="border border-red-200 bg-red-50 rounded-lg px-3 py-2">
              <p className="text-red-700 text-sm">⚠️ {error}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Creating...
              </>
            ) : (
              "Create Listing 🚀"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddPropertyModal;
