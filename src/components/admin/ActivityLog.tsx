"use client";

import { useEffect, useState } from "react";

type Entry = { id: string; action: string; entityType: string; entityId: string; createdAt: string; actor: { name: string; email: string } | null };
type Response = { entries: Entry[]; pagination: { page: number; totalPages: number } };

export function ActivityLog() {
  const [data, setData] = useState<Response | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  useEffect(() => { fetch(`/api/admin/activity-log?page=${page}`).then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<Response>; }).then(setData).catch(() => setError("Activity log could not be loaded.")); }, [page]);
  return <section className="mt-6 max-w-6xl">{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="overflow-x-auto rounded-xl border border-black/10 bg-white"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-black/10 text-[#666]"><tr><th className="px-4 py-3">When</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead><tbody>{data?.entries.map((entry) => <tr key={entry.id} className="border-b border-black/5"><td className="px-4 py-3 whitespace-nowrap">{new Date(entry.createdAt).toLocaleString()}</td><td>{entry.actor ? `${entry.actor.name} (${entry.actor.email})` : "System / removed user"}</td><td className="font-medium">{entry.action.replaceAll("_", " ")}</td><td>{entry.entityType} <span className="font-mono text-xs text-[#777]">{entry.entityId}</span></td></tr>)}{data?.entries.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-[#666]">No activity recorded.</td></tr>}</tbody></table></div>{data && data.pagination.totalPages > 1 && <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setPage(page - 1)} disabled={page === 1} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Previous</button><button type="button" onClick={() => setPage(page + 1)} disabled={page === data.pagination.totalPages} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Next</button></div>}</section>;
}
