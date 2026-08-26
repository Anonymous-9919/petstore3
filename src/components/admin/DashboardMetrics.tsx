"use client";

import { useEffect, useState } from "react";

type Metrics = { orders: number; grossOrderTotal: string; units: number; averageOrderValue: string };
type Data = { metrics: Metrics; comparison: { metrics: Metrics }; fulfillment: { delivered: number; refunded: number; cancelled: number; inProgress: number } };

const date = (offset: number) => { const value = new Date(); value.setUTCDate(value.getUTCDate() + offset); return value.toISOString().slice(0, 10); };

export function DashboardMetrics() {
  const [start, setStart] = useState(date(-29));
  const [end, setEnd] = useState(date(0));
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => { fetch(`/api/admin/reports?view=dashboard&start=${start}&end=${end}`).then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<Data>; }).then((response) => { setData(response); setError(""); }).catch(() => setError("Dashboard metrics could not be loaded.")); }, [start, end, retry]);
  return <section className="mt-6"><form className="flex flex-wrap items-end gap-3 rounded-xl border border-black/10 bg-white p-4" onSubmit={(event) => event.preventDefault()}><label className="text-sm font-medium">Dashboard start (UTC)<input className="mt-1 block rounded border border-black/15 px-3 py-2" type="date" value={start} onChange={(event) => { setError(""); setStart(event.target.value); }} /></label><label className="text-sm font-medium">Dashboard end (UTC)<input className="mt-1 block rounded border border-black/15 px-3 py-2" type="date" value={end} onChange={(event) => { setError(""); setEnd(event.target.value); }} /></label></form>{error && <div role="alert" className="mt-4 flex items-center gap-3 text-sm text-red-700"><span>{error}</span><button type="button" onClick={() => { setError(""); setRetry((value) => value + 1); }} className="rounded border border-red-300 px-3 py-1 font-semibold">Retry</button></div>}<div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Orders" value={data?.metrics.orders} previous={data?.comparison.metrics.orders} /><Metric label="Gross order total" value={data ? `${Number(data.metrics.grossOrderTotal).toFixed(3)} KD` : undefined} previous={data?.comparison.metrics.grossOrderTotal} /><Metric label="Units" value={data?.metrics.units} previous={data?.comparison.metrics.units} /><Metric label="AOV" value={data ? `${Number(data.metrics.averageOrderValue).toFixed(3)} KD` : undefined} previous={data?.comparison.metrics.averageOrderValue} /></div><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Currently delivered" value={data?.fulfillment.delivered} previous={undefined} /><Metric label="Currently refunded" value={data?.fulfillment.refunded} previous={undefined} /><Metric label="Currently cancelled" value={data?.fulfillment.cancelled} previous={undefined} /><Metric label="In progress" value={data?.fulfillment.inProgress} previous={undefined} /></div><p className="mt-3 text-sm text-[#666]">Gross order totals are not recognized revenue. Fulfillment counts use current status among orders created during the selected dates.</p></section>;
}

function Metric({ label, value, previous }: { label: string; value: string | number | undefined; previous: string | number | undefined }) { return <div className="rounded-xl border border-black/10 bg-white p-5"><p className="text-sm text-[#666]">{label}</p><p className="mt-2 text-2xl font-bold">{value ?? "Loading..."}</p>{previous !== undefined && <p className="mt-1 text-xs text-[#666]">Previous period: {previous}</p>}</div>; }
