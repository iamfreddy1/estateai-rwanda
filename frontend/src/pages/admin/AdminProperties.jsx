// ============================================
// ADMIN: PROPERTY MODERATION QUEUE
// ============================================
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import AdminGuard from "./_AdminGuard";
import { listPendingProperties, approveProperty, rejectProperty, featureProperty } from "../../api/admin";

function Row({ p, onApprove, onReject, onFeature, busy }) {
  const created = p.created_at ? new Date(p.created_at).toLocaleDateString() : "";
  const img = p.image || (p.images && p.images[0]);
  const priceStr = `${Math.round(p.price).toLocaleString()} ${p.currency}`;
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 py-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
      <div className="flex gap-4">
        {img ? (
          <a href={img} target="_blank" rel="noreferrer">
            <img src={img} alt="" className="w-32 h-24 object-cover rounded-lg border border-gray-300" />
          </a>
        ) : (
          <div className="w-32 h-24 flex items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">No image</div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{p.title}</p>
          <p className="text-sm text-gray-600 truncate">
            {p.property_type} · {p.type === "rent" ? "Rent" : "Buy"} · {p.sector || "—"}, {p.district || "—"}
          </p>
          <p className="text-sm mt-1"><b>{priceStr}</b>{p.size_sqft ? ` · ${p.size_sqft} sqft` : ""}{p.bedrooms ? ` · ${p.bedrooms} BR` : ""}</p>
          <p className="text-xs text-gray-400 mt-1">By {p.owner_name} · {created}</p>
        </div>
      </div>
      <div className="flex md:flex-col gap-2 md:w-44">
        <button disabled={busy === p.id} onClick={() => onApprove(p.id)}
          className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50">
          {busy === p.id ? "…" : "✓ Approve"}
        </button>
        <button disabled={busy === p.id} onClick={() => onReject(p.id)}
          className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50">
          {busy === p.id ? "…" : "✕ Reject"}
        </button>
        <button disabled={busy === p.id} onClick={() => onFeature(p.id)}
          className="flex-1 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50">
          {busy === p.id ? "…" : (p.featured ? "★ Unfeature" : "☆ Feature")}
        </button>
      </div>
    </div>
  );
}

function AdminPropertiesInner() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const d = await listPendingProperties(page);
      setItems(d.items || []); setTotal(d.total || 0);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  const wrap = async (fn, id) => {
    setBusy(id); setErr(null);
    try { await fn(); setItems(s => s.filter(p => p.id !== id)); }
    catch (e) { setErr(e.message); }
    finally { setBusy(null); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-sm text-blue-600 hover:underline">← Admin dashboard</Link>
      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-2 mb-1">🏠 Property moderation queue</h1>
      <p className="text-gray-500 mb-6">{total} listing(s) awaiting review. Approve to publish, reject with a reason, or feature on the home page.</p>
      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-5">
        {loading ? (
          <p className="py-8 text-center text-gray-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-gray-500">🎉 Nothing pending.</p>
        ) : (
          items.map(p => (
            <Row key={p.id} p={p} busy={busy}
              onApprove={(id) => wrap(() => approveProperty(id), id)}
              onReject={(id) => {
                const r = window.prompt("Reason for rejection:", "Insufficient or unclear photos");
                if (r) wrap(() => rejectProperty(id, r), id);
              }}
              onFeature={(id) => wrap(async () => {
                const r = await featureProperty(id, !items.find(x => x.id === id)?.featured);
                setItems(s => s.map(x => x.id === id ? r.property : x));
              }, id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminProperties() { return <AdminGuard><AdminPropertiesInner /></AdminGuard>; }
