// ============================================
// ADMIN DASHBOARD  (live stats + charts + recent activity)
// ============================================
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import AdminGuard from "./_AdminGuard";
import {
  getStats, getTimeseries, getTopSectors, getActivity,
} from "../../api/admin";

function StatCard({ to, label, value, sub, color = "blue" }) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
    rose: "from-rose-500 to-rose-600",
    purple: "from-purple-500 to-purple-600",
    slate: "from-slate-500 to-slate-600",
  };
  const Card = ({ children }) => (
    <div className={`rounded-2xl p-5 bg-gradient-to-br ${colors[color]} text-white shadow-lg hover:shadow-xl transition-shadow`}>
      {children}
    </div>
  );
  const body = (
    <>
      <p className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-3xl font-extrabold mt-1 tabular-nums">{value ?? "—"}</p>
      {sub && <p className="text-xs opacity-85 mt-1">{sub}</p>}
    </>
  );
  return to ? <Link to={to}><Card>{body}</Card></Link> : <Card>{body}</Card>;
}

function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function AdminDashboardInner() {
  const [stats, setStats] = useState(null);
  const [ts, setTs] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [activity, setActivity] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    Promise.all([getStats(), getTimeseries(30), getTopSectors(), getActivity(15)])
      .then(([s, t, sec, act]) => { setStats(s); setTs(t); setSectors(sec); setActivity(act); })
      .catch(e => setErr(e.message));
  }, []);

  if (err) return <div className="max-w-5xl mx-auto p-8"><p className="text-red-600">{err}</p></div>;
  if (!stats) return <div className="max-w-5xl mx-auto p-8 text-gray-500">Loading dashboard…</div>;

  // Merge daily timeseries into a single chart-friendly array, oldest first
  const byDate = new Map();
  for (const r of (ts?.users || [])) byDate.set(r.date, { date: r.date, users: r.count });
  for (const r of (ts?.properties || [])) {
    const ex = byDate.get(r.date) || { date: r.date };
    byDate.set(r.date, { ...ex, properties: r.count });
  }
  for (const r of (ts?.ai_messages || [])) {
    const ex = byDate.get(r.date) || { date: r.date };
    byDate.set(r.date, { ...ex, ai_messages: r.count });
  }
  const chartData = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({ ...d, users: d.users || 0, properties: d.properties || 0, ai_messages: d.ai_messages || 0 }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-1">🛡 Admin Dashboard</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">Live platform metrics, moderation queues, and AI activity.</p>

      {/* ===== Stat cards row 1 ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard label="Total Users" value={stats.users.total} sub={`+${stats.users.new_week} this week`} color="blue" />
        <StatCard label="Verified Sellers" value={stats.users.verified} sub={`${stats.agents.approved} agents`} color="emerald" />
        <StatCard label="Active Listings" value={stats.properties.active} sub={`${stats.properties.total} total`} color="purple" />
        <StatCard label="AI Conversations" value={stats.ai.conversations} sub={`${stats.ai.messages_week} msgs / wk`} color="slate" />
      </div>

      {/* ===== Stat cards row 2 — moderation queues with links ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard to="/admin/users-pending" label="Pending IDs" value={stats.users.pending_id} sub="Verify identities" color="amber" />
        <StatCard to="/admin/agents" label="Pending Agents" value={stats.agents.pending} sub="Approve applications" color="amber" />
        <StatCard to="/admin/properties" label="Pending Listings" value={stats.properties.pending} sub="Moderate properties" color="amber" />
        <StatCard label="Monthly Growth" value={`${stats.users.growth_pct_mom >= 0 ? "+" : ""}${stats.users.growth_pct_mom}%`} sub="users month-over-month" color={stats.users.growth_pct_mom >= 0 ? "emerald" : "rose"} />
      </div>

      {/* ===== Charts ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Activity — last 30 days</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="users" name="New users" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="properties" name="New listings" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="ai_messages" name="AI messages" stroke="#9333ea" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Top sectors</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={sectors} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="sector" width={90} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Listings" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ===== Quick navigation ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Link to="/admin/users-all" className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:shadow-md transition">
          <p className="font-bold text-gray-900 dark:text-gray-100">👥 All Users</p><p className="text-xs text-gray-500">Search, suspend, promote</p>
        </Link>
        <Link to="/admin/properties" className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:shadow-md transition">
          <p className="font-bold text-gray-900 dark:text-gray-100">🏠 Property Moderation</p><p className="text-xs text-gray-500">Approve, reject, feature</p>
        </Link>
        <Link to="/admin/users-pending" className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:shadow-md transition">
          <p className="font-bold text-gray-900 dark:text-gray-100">🪪 ID Verifications</p><p className="text-xs text-gray-500">Review uploaded IDs</p>
        </Link>
        <Link to="/admin/ai" className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:shadow-md transition">
          <p className="font-bold text-gray-900 dark:text-gray-100">🤖 AI Conversations</p><p className="text-xs text-gray-500">Review chat history</p>
        </Link>
      </div>

      {/* ===== Recent activity feed ===== */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Recent activity</h3>
        <ul className="divide-y divide-gray-200 dark:divide-gray-800">
          {activity.map((a, i) => (
            <li key={i} className="py-3 flex items-center gap-3">
              <span className="text-2xl">{a.kind === "user_signup" ? "👤" : "🏠"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{a.label}</p>
                {a.status && <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{a.status}</span>}
              </div>
              <span className="text-xs text-gray-400">{timeAgo(a.at)}</span>
            </li>
          ))}
          {activity.length === 0 && <p className="py-6 text-center text-gray-500 text-sm">No recent activity.</p>}
        </ul>
      </div>
    </div>
  );
}

export default function AdminDashboard() { return <AdminGuard><AdminDashboardInner /></AdminGuard>; }
