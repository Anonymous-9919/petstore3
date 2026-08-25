"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Notification = { id: string; title: string; body: string | null; href: string | null; readAt: string | null; createdAt: string };
type Response = { notifications: Notification[]; unread: number; pagination: { page: number; totalPages: number } };

export function NotificationsCenter() {
  const [data, setData] = useState<Response | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  async function load() {
    setError("");
    try {
      const response = await fetch(`/api/admin/notifications?page=${page}`);
      if (!response.ok) throw new Error();
      setData(await response.json() as Response);
    } catch { setError("Notifications could not be loaded."); }
  }
  useEffect(() => { void load(); }, [page]);
  async function markRead(id: string) {
    await fetch(`/api/admin/notifications/${id}`, { method: "PATCH" });
    void load();
  }
  async function markAllRead() {
    await fetch("/api/admin/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark-all-read" }) });
    void load();
  }
  return <section className="mt-6 max-w-4xl"><div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm text-[#666]">{data ? `${data.unread} unread` : "Loading notifications..."}</p><button type="button" onClick={() => void markAllRead()} disabled={!data?.unread} className="rounded border border-black/15 px-3 py-2 text-sm font-semibold disabled:opacity-50">Mark all read</button></div>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="overflow-hidden rounded-xl border border-black/10 bg-white">{data?.notifications.map((item) => <article key={item.id} className={`flex gap-3 border-b border-black/10 p-4 last:border-0 ${item.readAt ? "" : "bg-brand/5"}`}><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2"><h2 className="font-semibold">{item.title}</h2>{!item.readAt && <span className="text-xs font-bold text-brand">New</span>}</div>{item.body && <p className="mt-1 text-sm text-[#666]">{item.body}</p>}<p className="mt-2 text-xs text-[#777]">{new Date(item.createdAt).toLocaleString()}</p></div><div className="flex shrink-0 items-start gap-2">{item.href && <Link href={item.href} className="text-sm font-semibold text-brand">View</Link>}{!item.readAt && <button type="button" onClick={() => void markRead(item.id)} className="text-sm font-semibold text-[#555]">Read</button>}</div></article>)}{data?.notifications.length === 0 && <p className="p-8 text-center text-sm text-[#666]">No notifications yet.</p>}</div>{data && data.pagination.totalPages > 1 && <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setPage(page - 1)} disabled={page === 1} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Previous</button><button type="button" onClick={() => setPage(page + 1)} disabled={page === data.pagination.totalPages} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Next</button></div>}</section>;
}
