"use client";

import { useEffect, useState } from "react";

type Product = { id: string; legacyId: number | null; sku: string | null; name: string; nameAr: string; slug: string; basePrice: string; category: { name: string; nameAr: string } };
type Group = { key: string; match: "sku" | "exact-content"; canonical: Product; duplicates: Product[] };

export function DuplicateCatalogReview() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const load = async () => {
    setError("");
    const response = await fetch("/api/admin/catalog-duplicates");
    if (!response.ok) return setError("Unable to load duplicate candidates.");
    setGroups((await response.json()).groups);
  };
  useEffect(() => { void load(); }, []);
  async function archive(group: Group, product: Product) {
    if (!confirm(`Archive ${product.name}? This does not merge inventory, orders, or product data.`)) return;
    setBusy(product.id);
    setError("");
    const response = await fetch("/api/admin/catalog-duplicates/archive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id, canonicalProductId: group.canonical.id }) });
    setBusy(null);
    if (!response.ok) return setError((await response.json()).error ?? "Unable to archive product.");
    void load();
  }
  return <div className="space-y-5"><div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><b>Review only.</b> Matches are suggestions, not automatic merges. Archiving hides the selected duplicate from the storefront and checkout; it does not move inventory, orders, wishlists, promotions, or option data.</div>{error && <p className="text-sm text-red-700">{error}</p>}{groups.length === 0 ? <div className="rounded-xl border border-black/10 bg-white p-5 text-sm text-[#666]">No active duplicate candidates found.</div> : groups.map((group) => <section key={group.key} className="overflow-hidden rounded-xl border border-black/10 bg-white"><div className="border-b border-black/10 px-5 py-3 text-sm"><b>{group.match === "sku" ? "Matching SKU" : "Matching category, names, price, and image"}</b><span className="ml-2 text-[#666]">Canonical product is retained.</span></div><div className="grid divide-y divide-black/5"><ProductRow product={group.canonical} label="Canonical"/>{group.duplicates.map((product) => <ProductRow key={product.id} product={product} label="Duplicate" action={<button onClick={() => void archive(group, product)} disabled={busy === product.id} className="rounded border border-red-700 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">Archive duplicate</button>}/>)}</div></section>)}</div>;
}

function ProductRow({ product, label, action }: { product: Product; label: string; action?: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"><div><span className={label === "Canonical" ? "mr-2 rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800" : "mr-2 rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-800"}>{label}</span><b>{product.name}</b> <span className="text-[#666]">{product.nameAr}</span><div className="mt-1 text-xs text-[#666]">{product.category.name} | {product.sku ? `SKU: ${product.sku} | ` : ""}{product.basePrice} KWD | /{product.slug}{product.legacyId != null ? ` | Legacy ID: ${product.legacyId}` : ""}</div></div>{action}</div>;
}
