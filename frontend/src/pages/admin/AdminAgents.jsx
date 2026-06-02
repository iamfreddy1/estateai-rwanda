// ============================================
// ADMIN: PENDING AGENT APPLICATIONS
// ============================================
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import AdminGuard from "./_AdminGuard";
import { listPendingAgents, approveAgent, rejectAgent } from "../../api/admin";

function Row({ a, onApprove, onReject, busy }) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 py-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{a.name || a.email.split("@")[0]}</p>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{a.agent_status}</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{a.email}{a.phone ? ` · ${a.phone}` : ""}</p>
        <p className="text-sm mt-1"><b className="text-gray-700 dark:text-gray-300">Agency:</b> {a.agency_name || "—"}</p>
        <p className="text-sm"><b className="text-gray-700 dark:text-gray-300">License #:</b> {a.license_number || "—"}</p>
        {a.areas && <p className="text-sm"><b className="text-gray-700 dark:text-gray-300">Areas:</b> {a.areas}</p>}
        {a.bio && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">"{a.bio}"</p>}
        {a.license_doc_url && (
          <a href={a.license_doc_url} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs text-blue-600 hover:underline">
            📎 View license document
          </a>
        )}
      </div>
      <div className="flex md:flex-col gap-2 md:w-40">
        <button
          disabled={busy === a.id}
          onClick={() => onApprove(a.id)}
          className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
        >
          {busy === a.id ? "…" : "✓ Approve"}
        </button>
        <button
          disabled={busy === a.id}
          onClick={() => onReject(a.id)}
          className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
        >
          {busy === a.id ? "…" : "✕ Reject"}
        </button>
      </div>
    </div>
  );
}

function AdminAgentsInner() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setItems(await listPendingAgents()); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleApprove(id) {
    setBusy(id); setErr(null);
    try { await approveAgent(id); setItems(s => s.filter(a => a.id !== id)); }
    catch (e) { setErr(e.message); }
    finally { setBusy(null); }
  }
  async function handleReject(id) {
    const reason = window.prompt("Reason for rejection (shown to the agent):", "Documents need verification");
    if (!reason) return;
    setBusy(id); setErr(null);
    try { await rejectAgent(id, reason); setItems(s => s.filter(a => a.id !== id)); }
    catch (e) { setErr(e.message); }
    finally { setBusy(null); }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-sm text-blue-600 hover:underline">← Admin dashboard</Link>
      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-2 mb-1">🧑‍💼  Pending agent applications</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">Approved agents get a verified badge and can list properties without manual review.</p>
      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-5">
        {loading ? (
          <p className="py-8 text-center text-gray-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-gray-500">🎉 Nothing pending.</p>
        ) : (
          items.map(a => <Row key={a.id} a={a} onApprove={handleApprove} onReject={handleReject} busy={busy} />)
        )}
      </div>
    </div>
  );
}

export default function AdminAgents() { return <AdminGuard><AdminAgentsInner /></AdminGuard>; }
