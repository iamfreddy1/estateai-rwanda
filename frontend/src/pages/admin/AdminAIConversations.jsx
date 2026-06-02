// ============================================
// ADMIN: AI CONVERSATION REVIEW
// ============================================
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import AdminGuard from "./_AdminGuard";
import { listAIConversations, getAIConversationDetail } from "../../api/admin";

function ConversationList({ items, onPick, current }) {
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800 overflow-auto" style={{ maxHeight: 640 }}>
      {items.map(c => (
        <button key={c.id} onClick={() => onPick(c.id)}
          className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 ${current === c.id ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{c.title || "Untitled"}</p>
          <p className="text-xs text-gray-500 truncate">{c.user_email}</p>
          <p className="text-xs text-gray-400">{c.message_count} msgs · {c.updated_at ? new Date(c.updated_at).toLocaleString() : ""}</p>
          {c.last_message && <p className="text-xs italic text-gray-600 dark:text-gray-400 mt-1 truncate">“{c.last_message.content}”</p>}
        </button>
      ))}
    </div>
  );
}

function AdminAIInner() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [picked, setPicked] = useState(null);
  const [detail, setDetail] = useState(null);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await listAIConversations(page);
      setItems(d.items || []); setTotal(d.total || 0);
    } catch (e) { setErr(e.message); }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!picked) { setDetail(null); return; }
    getAIConversationDetail(picked).then(setDetail).catch(e => setErr(e.message));
  }, [picked]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-sm text-blue-600 hover:underline">← Admin dashboard</Link>
      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-2 mb-1">🤖 AI conversations</h1>
      <p className="text-gray-500 mb-6">{total} conversation(s). Pick one to view the full exchange.</p>
      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <ConversationList items={items} onPick={setPicked} current={picked} />
          <div className="flex justify-between text-xs p-2 border-t border-gray-200 dark:border-gray-800">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-2 py-1 rounded-md border disabled:opacity-40">‹ Prev</button>
            <span className="text-gray-500 self-center">Page {page}</span>
            <button disabled={page * 25 >= total} onClick={() => setPage(p => p + 1)} className="px-2 py-1 rounded-md border disabled:opacity-40">Next ›</button>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 min-h-[400px]">
          {!detail ? (
            <p className="text-gray-500 text-sm">Select a conversation on the left to inspect its messages.</p>
          ) : (
            <>
              <p className="font-bold text-gray-900 dark:text-gray-100">{detail.conversation.title}</p>
              <p className="text-xs text-gray-500 mb-4">{detail.user?.email}</p>
              <div className="space-y-3 max-h-[600px] overflow-auto pr-1">
                {detail.messages.map(m => (
                  <div key={m.id} className={`p-3 rounded-xl ${m.role === "user" ? "bg-blue-50 dark:bg-blue-900/20" : m.role === "system" ? "bg-gray-100 dark:bg-gray-800/50" : "bg-emerald-50 dark:bg-emerald-900/20"}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{m.role}</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{m.content}</p>
                    {m.tokens?.prompt && <p className="text-[10px] text-gray-400 mt-1">tokens: in {m.tokens.prompt}, out {m.tokens.completion}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminAIConversations() { return <AdminGuard><AdminAIInner /></AdminGuard>; }
