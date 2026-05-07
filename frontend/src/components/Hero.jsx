// ============================================
// HERO COMPONENT (Rwanda Edition)
// ============================================
// Hero with Kigali skyline + search that sends user to /buy?location=...

import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Hero() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      navigate(`/buy?location=${encodeURIComponent(q)}`);
    } else {
      navigate("/buy");
    }
  }

  return (
    <section
      className="relative h-[520px] flex items-center justify-center text-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1600')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="px-6 max-w-3xl w-full">
        {/* SUBTITLE TAG */}
        <span className="inline-block bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4">
          🇷🇼 Kigali, Rwanda
        </span>

        {/* HEADLINE */}
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg leading-tight">
          AI-Powered Property Valuation in Rwanda
        </h1>
        <p className="text-lg md:text-xl text-white mb-8 drop-shadow">
          Buy, rent, or estimate the price of homes &amp; land across Gasabo, Kicukiro, and Nyarugenge.
        </p>

        {/* SEARCH BAR */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-full shadow-2xl flex items-center p-2 max-w-2xl mx-auto"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try Nyarutarama, Kimihurura, Kacyiru..."
            className="flex-grow px-5 py-3 text-gray-800 outline-none rounded-full"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-full transition-colors flex items-center gap-2"
          >
            🔍 Search
          </button>
        </form>

        <p className="text-white/80 text-sm mt-4">
          Popular areas:{" "}
          <button onClick={() => navigate("/buy?sector=Nyarutarama")} className="underline hover:text-white">Nyarutarama</button>{" · "}
          <button onClick={() => navigate("/buy?sector=Kimihurura")} className="underline hover:text-white">Kimihurura</button>{" · "}
          <button onClick={() => navigate("/buy?sector=Kacyiru")} className="underline hover:text-white">Kacyiru</button>
        </p>
      </div>
    </section>
  );
}

export default Hero;
