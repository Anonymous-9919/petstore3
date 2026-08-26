"use client";

import { useEffect, useRef, useState } from "react";

type Option = { id: string; name: string };
type InventoryLevel = {
  id: string;
  quantity: number;
  reserved: number;
  lowStockAt: number;
  updatedAt: string;
  branch: Option;
  product: { id: string; name: string; nameAr: string; sku: string | null; isActive: boolean; archivedAt: string | null; category: Option };
};
type Movement = { id: string; type: string; quantity: number; beforeQuantity: number | null; afterQuantity: number | null; reason: string | null; reasonValue: string | null; referenceType: string | null; referenceId: string | null; correlationId: string | null; note: string | null; actorId: string | null; createdAt: string };
type Audit = { id: string; action: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null; createdAt: string };
type InventoryResponse = { inventoryLevels: InventoryLevel[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };

const initialResponse: InventoryResponse = { inventoryLevels: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } };

export function InventoryManager({ branches, categories, initialStock = "all" }: { branches: Option[]; categories: Option[]; initialStock?: string }) {
  const [data, setData] = useState<InventoryResponse>(initialResponse);
  const [branchId, setBranchId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stock, setStock] = useState(initialStock === "low-stock" ? "low-stock" : "all");
  const [query, setQuery] = useState("");
  const [deferredQuery, setDeferredQuery] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ledger, setLedger] = useState<{ levelId: string; movements: Movement[]; audits: Audit[] } | null>(null);
  const inventoryRequest = useRef(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDeferredQuery(query), 300);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    const request = ++inventoryRequest.current;
    const params = new URLSearchParams({ page: String(page), pageSize: "25", stock });
    if (branchId) params.set("branchId", branchId);
    if (categoryId) params.set("categoryId", categoryId);
    if (deferredQuery.trim()) params.set("query", deferredQuery.trim());
    void fetch(`/api/admin/inventory?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Unable to load inventory.");
        if (request === inventoryRequest.current) {
          setData(body);
          setError(null);
        }
      })
      .catch((cause: unknown) => { if (request === inventoryRequest.current && !(cause instanceof DOMException && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : "Unable to load inventory."); });
    return () => controller.abort();
  }, [branchId, categoryId, deferredQuery, page, stock]);

  function changeFilter(change: () => void) { setPage(1); change(); }

  async function adjust(event: React.FormEvent<HTMLFormElement>, inventoryLevelId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(inventoryLevelId); setError(null);
    try {
      const response = await fetch("/api/admin/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inventoryLevelId, quantity: Number(form.get("quantity")), reason: form.get("reason"), note: form.get("note") }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to adjust inventory.");
      event.currentTarget.reset();
      await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to adjust inventory."); }
    finally { setBusy(null); }
  }

  async function updateThreshold(event: React.FormEvent<HTMLFormElement>, inventoryLevelId: string) {
    event.preventDefault();
    const lowStockAt = Number(new FormData(event.currentTarget).get("lowStockAt"));
    setBusy(`threshold-${inventoryLevelId}`); setError(null);
    try {
      const response = await fetch("/api/admin/inventory", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inventoryLevelId, lowStockAt }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to update low-stock threshold.");
      await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update low-stock threshold."); }
    finally { setBusy(null); }
  }

  async function loadLedger(levelId: string) {
    setBusy(`ledger-${levelId}`); setError(null);
    try {
      const response = await fetch(`/api/admin/inventory?ledgerLevelId=${levelId}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to load inventory ledger.");
      setLedger({ levelId, movements: body.movements, audits: body.audits });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load inventory ledger."); }
    finally { setBusy(null); }
  }

  async function reload() {
    const request = ++inventoryRequest.current;
    const params = new URLSearchParams({ page: String(page), pageSize: "25", stock });
    if (branchId) params.set("branchId", branchId);
    if (categoryId) params.set("categoryId", categoryId);
    if (deferredQuery.trim()) params.set("query", deferredQuery.trim());
    const response = await fetch(`/api/admin/inventory?${params}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Unable to load inventory.");
    if (request === inventoryRequest.current) setData(body);
  }

  return <div className="mt-6 space-y-5">
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <section className="grid gap-3 rounded-xl border border-black/10 bg-white p-4 md:grid-cols-4">
      <input value={query} onChange={(event) => changeFilter(() => setQuery(event.target.value))} placeholder="Search product or SKU" className="rounded border border-black/15 px-3 py-2 text-sm" />
      <select value={branchId} onChange={(event) => changeFilter(() => setBranchId(event.target.value))} className="rounded border border-black/15 px-3 py-2 text-sm"><option value="">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
      <select value={categoryId} onChange={(event) => changeFilter(() => setCategoryId(event.target.value))} className="rounded border border-black/15 px-3 py-2 text-sm"><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
      <select value={stock} onChange={(event) => changeFilter(() => setStock(event.target.value))} className="rounded border border-black/15 px-3 py-2 text-sm"><option value="all">All stock</option><option value="in-stock">In stock</option><option value="out-of-stock">Out of stock</option><option value="low-stock">At or below threshold</option></select>
    </section>
    <section className="overflow-x-auto rounded-xl border border-black/10 bg-white"><table className="w-full min-w-[1250px] text-left text-sm"><thead className="border-b border-black/10 text-[#666]"><tr><th className="px-5 py-3">Product</th><th>Branch</th><th>Category</th><th>On hand</th><th>Reserved</th><th>Available</th><th>Threshold</th><th>Adjustment</th><th className="px-5">Ledger</th></tr></thead><tbody>
      {data.inventoryLevels.map((level) => <tr key={level.id} className="border-b border-black/5 align-top last:border-0"><td className="px-5 py-3"><b>{level.product.name}</b>{level.product.sku && <span className="ml-2 text-[#666]">{level.product.sku}</span>}{(!level.product.isActive || level.product.archivedAt) && <span className="ml-2 text-xs text-red-700">Inactive</span>}</td><td className="py-3">{level.branch.name}</td><td className="py-3">{level.product.category.name}</td><td className="py-3">{level.quantity}</td><td className="py-3">{level.reserved}</td><td className="py-3">{level.quantity - level.reserved}</td><td className="py-2"><form onSubmit={(event) => void updateThreshold(event, level.id)} className="flex gap-1"><input name="lowStockAt" type="number" min="0" defaultValue={level.lowStockAt} aria-label={`Low-stock threshold for ${level.product.name}`} className="w-16 rounded border border-black/15 px-2 py-1"/><button disabled={busy === `threshold-${level.id}`} className="rounded border border-black/15 px-2 text-xs disabled:opacity-50">Set</button></form></td><td className="py-2"><form onSubmit={(event) => void adjust(event, level.id)} className="flex gap-1"><input name="quantity" type="number" required step="1" placeholder="+/-" aria-label={`Adjustment for ${level.product.name}`} className="w-16 rounded border border-black/15 px-2 py-1"/><select name="reason" aria-label={`Reason for ${level.product.name}`} className="w-28 rounded border border-black/15 px-1 py-1"><option>Count correction</option><option>Damage</option><option>Receiving</option><option>Return</option><option>Other</option></select><input name="note" required maxLength={500} placeholder="Note" aria-label={`Note for ${level.product.name}`} className="w-32 rounded border border-black/15 px-2 py-1"/><button disabled={busy === level.id} className="rounded border border-brand px-2 text-xs font-semibold text-brand disabled:opacity-50">Save</button></form></td><td className="px-5 py-2"><button onClick={() => void loadLedger(level.id)} disabled={busy === `ledger-${level.id}`} className="rounded border border-black/15 px-2 py-1 text-xs disabled:opacity-50">View</button></td></tr>)}
      {data.inventoryLevels.length === 0 && <tr><td colSpan={9} className="px-5 py-8 text-[#666]">No inventory levels match these filters.</td></tr>}
    </tbody></table></section>
    <div className="flex items-center justify-between text-sm"><span>{data.pagination.total} levels</span><div className="flex items-center gap-3"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border border-black/15 px-3 py-1 disabled:opacity-50">Previous</button><span>Page {data.pagination.page} of {data.pagination.totalPages || 1}</span><button disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)} className="rounded border border-black/15 px-3 py-1 disabled:opacity-50">Next</button></div></div>
    {ledger && <section className="rounded-xl border border-black/10 bg-white"><header className="flex items-center justify-between border-b border-black/10 px-5 py-4"><h2 className="font-bold">Stock movement ledger</h2><button onClick={() => setLedger(null)} className="text-sm text-brand">Close</button></header><div className="grid gap-5 p-5 lg:grid-cols-2"><div><h3 className="mb-2 text-sm font-semibold">Movements</h3><div className="space-y-2">{ledger.movements.map((movement) => <div key={movement.id} className="rounded border border-black/10 p-3 text-sm"><b>{movement.reason ?? movement.type}</b>{movement.reasonValue && <span className="ml-2 text-[#666]">{movement.reasonValue}</span>}<span className="ml-2">{movement.quantity > 0 ? "+" : ""}{movement.quantity}</span><p className="mt-1 text-[#666]">On hand: {movement.beforeQuantity ?? "Unknown"} to {movement.afterQuantity ?? "Unknown"}</p>{movement.referenceType && <p className="text-xs text-[#666]">Reference: {movement.referenceType} {movement.referenceId ?? ""}</p>}{movement.correlationId && <p className="text-xs text-[#666]">Correlation: {movement.correlationId}</p>}<p className="mt-1 text-[#666]">{movement.note ?? "No note"}</p><time className="text-xs text-[#666]">{new Date(movement.createdAt).toLocaleString()}</time></div>)}{ledger.movements.length === 0 && <p className="text-sm text-[#666]">No movements recorded.</p>}</div></div><div><h3 className="mb-2 text-sm font-semibold">Audit snapshots</h3><div className="space-y-2">{ledger.audits.map((audit) => <div key={audit.id} className="rounded border border-black/10 p-3 text-sm"><b>{audit.action}</b><p className="mt-1 text-[#666]">Before: {JSON.stringify(audit.before ?? {})}</p><p className="text-[#666]">After: {JSON.stringify(audit.after ?? {})}</p><time className="text-xs text-[#666]">{new Date(audit.createdAt).toLocaleString()}</time></div>)}{ledger.audits.length === 0 && <p className="text-sm text-[#666]">No audit snapshots recorded.</p>}</div></div></div></section>}
  </div>;
}
