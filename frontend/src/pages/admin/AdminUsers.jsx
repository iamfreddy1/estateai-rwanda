// ============================================
// ADMIN: PENDING IDENTITY VERIFICATIONS
// ============================================
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import AdminGuard from "./_AdminGuard";
import { listPendingUsers, verifyUser, rejectUser } from "../../api/admin";

function Row({ u, onVerify, onReject, busy }) {
  const created = u.created_at ? new Date(u.created_at).toLocaleDateString() : "";
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 py-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
      <div className="flex gap-4">
        {u.national_id_url ? (
          <a href={u.national_id_url} target="_blank" rel="noreferrer" title="Open full size">
            <img src={u.national_id_url} alt="National ID" className="w-28 h-20 object-cover rounded-lg border border-gray-300 dark:border-gray-700" />
          </a>
        ) : (
          <div className="w-28 h-20 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-gray-500">No image</div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{u.name || u.email.split("@")[0]}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{u.email}</p>
          <p className="text-xs text-gray-400 mt-1">Joined {created}</p>
        </div>
      </div>
      <div className="flex md:flex-col gap-2 md:w-40">
        <button
          disabled={busy === u.id}
          onClick={() => onVerify(u.id)}
          className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
        >
          {busy === u.id ? "…" : "✓ Verify"}
        </button>
        <button
          disabled={busy === u.id}
          onClick={() => onReject(u.id)}
          className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
        >
          {busy === u.id ? "…" : "✕ Reject"}
        </button>
      </div>
    </div>
  );
}

function AdminUsersInner() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setItems(await listPendingUsers()); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleVerify(id) {
    setBusy(id); setErr(null);
    try { await verifyUser(id); setItems(s => s.filter(u => u.id !== id)); }
    catch (e) { setErr(e.message); }
    finally { setBusy(null); }
  }
  async function handleReject(id) {
    const reason = window.prompt("Reason for rejection (shown to the user):", "Document unclear");
    if (!reason) return;
    setBusy(id); setErr(null);
    try { await rejectUser(id, reason); setItems(s => s.filter(u => u.id !== id)); }
    catch (e) { setErr(e.message); }
    finally { setBusy(null); }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-sm text-blue-600 hover:underline">← Admin dashboard</Link>
      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-2 mb-1">🪪  Pending identity verifications</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">Review each ID upload. Verified accounts unlock seller features.</p>
      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-5">
        {loading ? (
          <p className="py-8 text-center text-gray-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-gray-500">🎉 Nothing pending.</p>
        ) : (
          items.map(u => <Row key={u.id} u={u} onVerify={handleVerify} onReject={handleReject} busy={busy} />)
        )}
      </div>
    </div>
  );
}

export default function AdminUsers() { return <AdminGuard><AdminUsersInner /></AdminGuard>; }
