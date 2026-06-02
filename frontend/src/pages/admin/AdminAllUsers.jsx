// ============================================
// ADMIN: ALL USERS  (search + suspend + promote)
// ============================================
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import AdminGuard from "./_AdminGuard";
import { listUsers, suspendUser, unsuspendUser, promoteUser } from "../../api/admin";

function Badge({ kind, label }) {
  const map = {
    verified: "bg-emerald-100 text-emerald-800",
    pending: "bg-amber-100 text-amber-800",
    unverified: "bg-gray-200 text-gray-700",
    rejected: "bg-rose-100 text-rose-800",
    admin: "bg-blue-100 text-blue-800",
    suspended: "bg-rose-100 text-rose-800",
    agent: "bg-purple-100 text-purple-800",
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[kind] || "bg-gray-100 text-gray-700"}`}>{label}</span>;
}

function AdminAllUsersInner() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const d = await listUsers({ page, q, status });
      setItems(d.items || []); setTotal(d.total || 0);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [page, q, status]);
  useEffect(() => { load(); }, [load]);

  const updateUser = (uid, updated) => setItems(s => s.map(u => u.id === uid ? updated : u));
  const wrap = async (uid, fn) => {
    setBusy(uid); setErr(null);
    try { const r = await fn(); if (r?.user) updateUser(uid, r.user); }
    catch (e) { setErr(e.message); }
    finally { setBusy(null); }
  };

  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-sm text-blue-600 hover:underline">← Admin dashboard</Link>
      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-2 mb-1">👥 All users</h1>
      <p className="text-gray-500 mb-4">{total} user(s) total. Search by name or email; filter by status.</p>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
          placeholder="Search email or name…"
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
          <option value="">All statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending ID</option>
          <option value="unverified">Unverified</option>
          <option value="rejected">Rejected</option>
          <option value="admin">Admins</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-left text-gray-600 dark:text-gray-300">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {loading ? (
              <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={4}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={4}>No users.</td></tr>
            ) : items.map(u => (
              <tr key={u.id} className={u.suspended ? "opacity-60" : ""}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{u.name || u.email.split("@")[0]}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </td>
                <td className="px-4 py-3 space-x-1">
                  <Badge kind={u.verification_status} label={u.verification_status} />
                  {u.is_admin && <Badge kind="admin" label="admin" />}
                  {u.is_agent && <Badge kind="agent" label="agent" />}
                  {u.suspended && <Badge kind="suspended" label="suspended" />}
                </td>
                <td className="px-4 py-3 text-gray-500">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  {!u.is_admin && (
                    u.suspended ? (
                      <button disabled={busy === u.id} onClick={() => wrap(u.id, () => unsuspendUser(u.id))}
                        className="px-3 py-1 rounded-md bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50">Unsuspend</button>
                    ) : (
                      <button disabled={busy === u.id} onClick={() => {
                        const r = window.prompt("Reason for suspension:", "Terms violation");
                        if (r) wrap(u.id, () => suspendUser(u.id, r));
                      }}
                        className="px-3 py-1 rounded-md bg-rose-600 text-white text-xs font-semibold disabled:opacity-50">Suspend</button>
                    )
                  )}
                  {!u.is_admin && (
                    <button disabled={busy === u.id} onClick={() => {
                      if (window.confirm(`Promote ${u.email} to admin?`)) wrap(u.id, () => promoteUser(u.id));
                    }}
                      className="px-3 py-1 rounded-md bg-blue-600 text-white text-xs font-semibold disabled:opacity-50">Make admin</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm">
        <span className="text-gray-500">Page {page} of {pages}</span>
        <div className="space-x-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-40">‹ Prev</button>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-40">Next ›</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAllUsers() { return <AdminGuard><AdminAllUsersInner /></AdminGuard>; }
