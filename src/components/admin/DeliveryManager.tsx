"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Branch = {
  id: string;
  name: string;
  nameAr: string;
  isActive: boolean;
  deliveryEnabled: boolean;
  coverage: Array<{
    id: string;
    isActive: boolean;
    deliveryFee: string;
    minimumOrderValue: string;
    priority: number;
    area: { name: string; nameAr: string; province: { name: string; nameAr: string } };
  }>;
};

async function updateDelivery(payload: object) {
  const response = await fetch("/api/admin/delivery", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Unable to save delivery settings.");
}

export function DeliveryManager({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (key: string, payload: object) => {
    setBusy(key);
    setError(null);
    try {
      await updateDelivery(payload);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save delivery settings.");
    } finally {
      setBusy(null);
    }
  };

  return <div className="mt-6 space-y-6">
    {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    {branches.map((branch) => <section key={branch.id} className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void save(`branch-${branch.id}`, { type: "branch", branchId: branch.id, isActive: form.get("isActive") === "on", deliveryEnabled: form.get("deliveryEnabled") === "on" }); }} className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 px-5 py-4">
        <div><h2 className="font-bold">{branch.name}</h2><p className="text-sm text-[#666]">{branch.nameAr}</p></div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2"><input name="isActive" type="checkbox" defaultChecked={branch.isActive} /> Branch active</label>
          <label className="flex items-center gap-2"><input name="deliveryEnabled" type="checkbox" defaultChecked={branch.deliveryEnabled} /> Delivery enabled</label>
          <button disabled={busy === `branch-${branch.id}`} className="rounded bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Save branch</button>
        </div>
      </form>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-black/10 text-[#666]"><tr><th className="px-5 py-3">Area</th><th>Enabled</th><th>Delivery fee (KD)</th><th>Minimum order (KD)</th><th>Priority</th><th className="px-5">Action</th></tr></thead><tbody>{branch.coverage.map((coverage) => <tr key={coverage.id} className="border-b border-black/5 last:border-0"><td className="px-5 py-3"><b>{coverage.area.name}</b><span className="ml-2 text-[#666]">{coverage.area.province.name}</span></td><td colSpan={5}><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void save(`coverage-${coverage.id}`, { type: "coverage", coverageId: coverage.id, isActive: form.get("isActive") === "on", deliveryFee: Number(form.get("deliveryFee")), minimumOrderValue: Number(form.get("minimumOrderValue")), priority: Number(form.get("priority")) }); }} className="grid grid-cols-[100px_150px_170px_100px_auto] items-center gap-3 py-2 pr-5"><label><input name="isActive" type="checkbox" defaultChecked={coverage.isActive} /><span className="sr-only">Enabled</span></label><input name="deliveryFee" type="number" min="0" step="0.001" required defaultValue={coverage.deliveryFee} className="rounded border border-black/15 px-2 py-1.5"/><input name="minimumOrderValue" type="number" min="0" step="0.001" required defaultValue={coverage.minimumOrderValue} className="rounded border border-black/15 px-2 py-1.5"/><input name="priority" type="number" min="0" step="1" required defaultValue={coverage.priority} className="rounded border border-black/15 px-2 py-1.5"/><button disabled={busy === `coverage-${coverage.id}`} className="rounded border border-brand px-3 py-1.5 text-xs font-semibold text-brand disabled:opacity-50">Save</button></form></td></tr>)}{branch.coverage.length === 0 && <tr><td colSpan={6} className="px-5 py-6 text-[#666]">No delivery areas are assigned to this branch.</td></tr>}</tbody></table></div>
    </section>)}
    {branches.length === 0 && <p className="rounded-xl border border-black/10 bg-white px-5 py-8 text-sm text-[#666]">No branches are configured.</p>}
  </div>;
}
