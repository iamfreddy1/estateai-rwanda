// ============================================
// HOME PAGE (Rwanda Edition)
// ============================================
// Hero + dual AI CTA cards (House + Land) + featured Kigali listings.

import { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import Hero from "../components/Hero";
import PropertyGrid from "../components/PropertyGrid";
import { listPropertiesApi, deletePropertyApi } from "../properties";

function Home() {
  const { user } = useOutletContext();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Show 9 featured properties (mix of types)
    listPropertiesApi()
      .then((props) => {
        if (!cancelled) setProperties(props.slice(0, 9));
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  async function handleDelete(propertyId) {
    try {
      await deletePropertyApi(propertyId);
      setProperties((prev) => prev.filter((p) => p.id !== propertyId));
    } catch (err) {
      alert(`Could not delete: ${err.message}`);
    }
  }

  return (
    <>
      <Hero />

      {/* Dual AI CTA - House + Land */}
      <section className="py-16 px-6 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              AI-Powered Price Estimation 🤖
            </h2>
            <p className="text-blue-100">
              Get an instant valuation using our Random Forest models trained on Kigali data
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* House estimate card */}
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center hover:scale-105 transition-transform">
              <div className="text-5xl mb-3">🏠</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Estimate a House</h3>
              <p className="text-gray-600 mb-6">
                Bedrooms, sqft, sector, finishes — get a price in seconds.
              </p>
              <Link
                to="/estimate-house"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition-colors"
              >
                Estimate House Price →
              </Link>
            </div>

            {/* Land estimate card */}
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center hover:scale-105 transition-transform">
              <div className="text-5xl mb-3">🌳</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Estimate Land</h3>
              <p className="text-gray-600 mb-6">
                Plot size, road access, slope, title deed — instant valuation.
              </p>
              <Link
                to="/estimate-land"
                className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-lg transition-colors"
              >
                Estimate Land Price →
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Featured properties */}
      <PropertyGrid
        properties={properties}
        loading={loading}
        error={error}
        currentUserId={user?.id}
        onDelete={handleDelete}
        title="Featured Kigali Properties"
        subtitle="Hand-picked listings from Gasabo, Kicukiro, and Nyarugenge"
      />
    </>
  );
}

export default Home;
