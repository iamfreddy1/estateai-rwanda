// ============================================
// DASHBOARD PAGE
// ============================================
// Pulls /analytics from the backend and renders charts.
// Uses Recharts for bar / pie / line charts.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

import { getAnalyticsApi } from "../properties";
import { formatRWF } from "../utils";


const COLORS = ["#2563eb", "#16a34a", "#eab308", "#dc2626", "#9333ea", "#0891b2"];


function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAnalyticsApi()
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
          <p className="text-red-700">⚠️ {error || "No data"}</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const districtData = data.by_district.map((d) => ({
    name: d.district,
    avg: Math.round(d.avg_price / 1_000_000),     // in millions
    count: d.count,
  }));

  const sectorData = data.by_sector.slice(0, 8).map((s) => ({
    name: s.sector,
    avg: Math.round(s.avg_price / 1_000_000),
  }));

  const propertyTypeData = Object.entries(data.totals.by_property_type || {}).map(
    ([name, value]) => ({ name, value })
  );

  const buyRentData = [
    { name: "For Sale", value: data.totals.buy },
    { name: "For Rent", value: data.totals.rent },
  ];

  return (
    <div className="bg-gray-50 min-h-[80vh]">

      {/* HERO */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 py-12 px-6 text-center text-white">
        <h1 className="text-3xl md:text-5xl font-bold mb-2">📊 Dashboard</h1>
        <p className="opacity-90">Live analytics across Kigali property listings</p>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">

        {/* TOP METRICS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Total Listings" value={data.totals.all} emoji="🏘" color="blue" />
          <Stat label="For Sale" value={data.totals.buy} emoji="🏷️" color="indigo" />
          <Stat label="For Rent" value={data.totals.rent} emoji="🔑" color="green" />
          <Stat
            label="Avg House Price"
            value={formatRWF(data.averages.overall_avg_price_rwf, { compact: true })}
            emoji="💰"
            color="purple"
          />
        </div>

        {/* AVG PRICE BY DISTRICT (bar) */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">💎 Average Price by District</h2>
          <p className="text-sm text-gray-500 mb-4">Houses for sale (in millions of RWF)</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={districtData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: "M RWF", angle: -90, position: "insideLeft" }} />
              <Tooltip
                formatter={(v) => `${v}M RWF`}
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <Bar dataKey="avg" fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AVG PRICE BY SECTOR (top 8) */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">🏆 Top Sectors by Average Price</h2>
          <p className="text-sm text-gray-500 mb-4">Premium Kigali neighborhoods (RWF millions)</p>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={sectorData} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip formatter={(v) => `${v}M RWF`} />
              <Bar dataKey="avg" fill="#9333ea" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* TWO PIES side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* By property type */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">🏠 Property Type Mix</h2>
            <p className="text-sm text-gray-500 mb-4">Houses, villas, apartments, land</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={propertyTypeData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  {propertyTypeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Buy vs rent */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">🔄 Buy vs Rent</h2>
            <p className="text-sm text-gray-500 mb-4">Distribution of listings</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={buyRentData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  <Cell fill="#2563eb" />
                  <Cell fill="#16a34a" />
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RECENT LISTINGS */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🆕 Recent Listings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {data.recent_listings.map((p) => (
              <Link key={p.id} to={`/property/${p.id}`}
                className="block bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors"
              >
                <img src={p.image} alt={p.title}
                  className="w-full h-24 object-cover rounded mb-2"
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400"; }}
                />
                <p className="font-bold text-sm text-blue-600">{formatRWF(p.price, { compact: true })}</p>
                <p className="text-xs text-gray-700 line-clamp-1">{p.title}</p>
                <p className="text-xs text-gray-500">📍 {p.sector}</p>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}


function Stat({ label, value, emoji, color }) {
  const colors = {
    blue:   "from-blue-50 to-blue-100 text-blue-700",
    indigo: "from-indigo-50 to-indigo-100 text-indigo-700",
    green:  "from-green-50 to-green-100 text-green-700",
    purple: "from-purple-50 to-purple-100 text-purple-700",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-5 shadow-sm`}>
      <p className="text-3xl mb-1">{emoji}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  );
}

export default Dashboard;
