"use client";

import { useEffect, useState } from "react";

type Option = { id: string; name: string };
type Metrics = { orders: number; grossOrderTotal: string; discountTotal: string | null; deliveryFee: string | null; units: number; averageOrderValue: string };
type Filters = { start: string; end: string; branchId: string; categoryId: string; productId: string };
type Table = "sales" | "products" | "categories" | "branches" | "customers" | "orders" | "promotions" | "inventory";
type Report = { dateSemantics: string; metrics: Metrics; comparison: { metrics: Metrics }; orderStatuses: Array<{ status: string; _count: number }>; fulfillment: { delivered: number; refunded: number; cancelled: number; inProgress: number; duration: { recordedDeliveries: number; averageHours: string | null; coverage: "complete" | "sampled"; limit: number } }; inventoryValuation: { status: "available" | "partial" | "unavailable"; cost: string | null; knownUnits: number; unavailableUnits: number; note: string }; filterOptions: { branches: Option[]; categories: Option[]; products: Array<Option & { sku: string | null; categoryId: string }>; limit: number; truncated: { branches: boolean; categories: boolean; products: boolean } } };
type TableData = { rows: Array<Record<string, unknown>>; pagination: { hasNextPage: boolean }; notes: string[] };

const amount = (value: string) => `${Number(value).toFixed(3)} KD`;
const today = () => new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = () => { const date = new Date(); date.setUTCDate(date.getUTCDate() - 29); return date.toISOString().slice(0, 10); };
const paramsFor = (filters: Filters) => new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
const tables: Array<{ value: Table; label: string }> = [
  { value: "sales", label: "Sales" }, { value: "products", label: "Products" }, { value: "categories", label: "Categories" }, { value: "branches", label: "Branches" },
  { value: "customers", label: "Customers" }, { value: "orders", label: "Orders" }, { value: "promotions", label: "Promotions" }, { value: "inventory", label: "Inventory" },
];

export function ReportsDashboard() {
  const [filters, setFilters] = useState<Filters>({ start: thirtyDaysAgo(), end: today(), branchId: "", categoryId: "", productId: "" });
  const [activeFilters, setActiveFilters] = useState(filters);
  const [report, setReport] = useState<Report | null>(null);
  const [table, setTable] = useState<Table>("sales");
  const [page, setPage] = useState(1);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/reports?${paramsFor(activeFilters)}`)
      .then(async (response) => { if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Unable to load reports."); return response.json() as Promise<Report>; })
      .then((data) => { setReport(data); setError(null); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load reports."));
  }, [activeFilters]);
  useEffect(() => {
    const params = paramsFor(activeFilters);
    params.set("table", table);
    params.set("page", String(page));
    fetch(`/api/admin/reports?${params}`).then((response) => response.ok ? response.json() : Promise.reject(new Error("Unable to load report table."))).then(setTableData).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load report table."));
  }, [activeFilters, table, page]);

  const products = report?.filterOptions.products.filter((product) => !filters.categoryId || product.categoryId === filters.categoryId) ?? [];
  const itemScoped = Boolean(activeFilters.productId || activeFilters.categoryId);
  const update = (name: keyof Filters, value: string) => setFilters((current) => ({ ...current, [name]: value, ...(name === "categoryId" ? { productId: "" } : {}) }));
  return <div className="mt-6 space-y-6">
    <form className="grid gap-3 rounded-xl border border-black/10 bg-white p-4 md:grid-cols-3 xl:grid-cols-6" onSubmit={(event) => { event.preventDefault(); setPage(1); setActiveFilters(filters); }}>
      <DateInput label="Start (UTC)" value={filters.start} onChange={(value) => update("start", value)} />
      <DateInput label="End (UTC)" value={filters.end} onChange={(value) => update("end", value)} />
      <Select label="Branch" value={filters.branchId} onChange={(value) => update("branchId", value)} options={report?.filterOptions.branches ?? []} />
      <Select label="Category" value={filters.categoryId} onChange={(value) => update("categoryId", value)} options={report?.filterOptions.categories ?? []} />
      <Select label="Product" value={filters.productId} onChange={(value) => update("productId", value)} options={products.map((product) => ({ ...product, name: product.sku ? `${product.name} (${product.sku})` : product.name }))} />
      <div className="flex items-end gap-2"><button className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white" type="submit">Apply</button><a className="rounded border border-black/15 px-4 py-2 text-sm font-semibold" href={`/api/admin/reports?${paramsFor(filters)}&format=csv`}>CSV</a></div>
    </form>
    {error && <p role="alert" className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    {report && <>
      <p className="text-sm text-[#666]">{report.dateSemantics} Fulfillment counts use each matching order&apos;s current status. Amounts are not labelled as revenue.</p>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card label={itemScoped ? "Matching orders" : "Orders"} value={report.metrics.orders} /><Card label={itemScoped ? "Gross line total" : "Gross order total"} value={amount(report.metrics.grossOrderTotal)} /><Card label="Units" value={report.metrics.units} /><Card label={itemScoped ? "Line total / matching order" : "AOV"} value={amount(report.metrics.averageOrderValue)} /></section>
      {(report.metrics.discountTotal !== null || report.metrics.deliveryFee !== null) && <section className="grid gap-4 sm:grid-cols-2"><>{report.metrics.discountTotal !== null && <Card label="Discounts" value={amount(report.metrics.discountTotal)} />}</><>{report.metrics.deliveryFee !== null && <Card label="Delivery fees" value={amount(report.metrics.deliveryFee)} />}</></section>}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card label="Currently delivered" value={report.fulfillment.delivered} /><Card label="Currently refunded" value={report.fulfillment.refunded} /><Card label="Currently cancelled" value={report.fulfillment.cancelled} /><Card label="In progress" value={report.fulfillment.inProgress} /></section>
      <section className="grid gap-4 lg:grid-cols-2"><StatusDistribution statuses={report.orderStatuses} /><div className="rounded-xl border border-black/10 bg-white p-5"><p className="text-sm text-[#666]">Recorded delivery time</p><p className="mt-2 text-2xl font-bold">{report.fulfillment.duration.averageHours === null ? "Unavailable" : `${report.fulfillment.duration.averageHours} hours`}</p><p className="mt-2 text-sm text-[#666]">Based on {report.fulfillment.duration.recordedDeliveries} recorded DELIVERED status events, from order creation. Missing history is excluded.{report.fulfillment.duration.coverage === "sampled" ? ` First ${report.fulfillment.duration.limit} events only; this is a sample.` : ""}</p></div></section>
      <section className="rounded-xl border border-black/10 bg-white p-5"><p className="text-sm text-[#666]">Inventory valuation</p><p className="mt-2 text-2xl font-bold">{report.inventoryValuation.cost === null ? "Unavailable" : amount(report.inventoryValuation.cost)}</p><p className="mt-2 text-sm text-[#666]">{report.inventoryValuation.status} coverage: {report.inventoryValuation.knownUnits} units valued; {report.inventoryValuation.unavailableUnits} units unavailable. {report.inventoryValuation.note}</p></section>
      {(report.filterOptions.truncated.branches || report.filterOptions.truncated.categories || report.filterOptions.truncated.products) && <p className="text-sm text-[#666]">Filter lists show the first {report.filterOptions.limit} alphabetical options. Refine a selection through the relevant admin page if it is not listed.</p>}
      <section className="rounded-xl border border-black/10 bg-white p-4"><div className="flex flex-wrap gap-2">{tables.map((entry) => <button key={entry.value} type="button" className={`rounded px-3 py-2 text-sm font-semibold ${table === entry.value ? "bg-brand text-white" : "border border-black/15"}`} onClick={() => { setTable(entry.value); setPage(1); }}>{entry.label}</button>)}</div>{tableData && <><DataTable rows={tableData.rows} />{tableData.notes.map((note) => <p key={note} className="mt-3 text-sm text-[#666]">{note}</p>)}<div className="mt-4 flex justify-end gap-2"><button type="button" className="rounded border border-black/15 px-3 py-2 text-sm disabled:opacity-50" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button><button type="button" className="rounded border border-black/15 px-3 py-2 text-sm disabled:opacity-50" disabled={!tableData.pagination.hasNextPage} onClick={() => setPage((current) => current + 1)}>Next</button></div></>}</section>
    </>}
  </div>;
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-sm font-medium">{label}<input className="mt-1 block w-full rounded border border-black/15 px-3 py-2" type="date" value={value} onChange={(event) => onChange(event.target.value)} required /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Option[] }) { return <label className="text-sm font-medium">{label}<select className="mt-1 block w-full rounded border border-black/15 bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}><option value="">All</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>; }
function Card({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-black/10 bg-white p-5"><p className="text-sm text-[#666]">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>; }
function StatusDistribution({ statuses }: { statuses: Array<{ status: string; _count: number }> }) { const maximum = Math.max(...statuses.map((item) => item._count), 1); return <div className="rounded-xl border border-black/10 bg-white p-5"><p className="text-sm font-semibold">Current fulfillment status distribution</p><div className="mt-4 space-y-3">{statuses.map((item) => <div key={item.status}><div className="flex justify-between text-sm"><span>{item.status.replaceAll("_", " ")}</span><span>{item._count}</span></div><div className="mt-1 h-2 overflow-hidden rounded bg-black/10"><div className="h-full rounded bg-brand" style={{ width: `${item._count / maximum * 100}%` }} /></div></div>)}</div>{!statuses.length && <p className="mt-4 text-sm text-[#666]">No matching orders.</p>}</div>; }
function DataTable({ rows }: { rows: Array<Record<string, unknown>> }) { const columns = rows[0] ? Object.keys(rows[0]) : []; return <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{columns.map((column) => <th key={column} className="border-b border-black/10 px-3 py-2">{column.replaceAll("_", " ")}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column} className="border-b border-black/5 px-3 py-2">{String(row[column] ?? "")}</td>)}</tr>)}</tbody></table>{!rows.length && <p className="py-6 text-sm text-[#666]">No matching rows.</p>}</div>; }
