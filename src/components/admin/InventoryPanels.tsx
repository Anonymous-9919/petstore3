"use client";

import { useState } from "react";
import { InventoryTransfers } from "@/components/admin/InventoryTransfers";
import { StockMovements } from "@/components/admin/StockMovements";

type Option = { id: string; name: string };

export function InventoryPanels({ branches, categories }: { branches: Option[]; categories: Option[] }) {
  const [panel, setPanel] = useState<"movements" | "transfers" | null>(null);
  return <section className="mt-8"><div className="flex gap-2"><button type="button" onClick={() => setPanel(panel === "movements" ? null : "movements")} className="rounded border border-brand px-3 py-2 text-sm font-semibold text-brand">{panel === "movements" ? "Hide movements" : "Stock movements"}</button><button type="button" onClick={() => setPanel(panel === "transfers" ? null : "transfers")} className="rounded border border-brand px-3 py-2 text-sm font-semibold text-brand">{panel === "transfers" ? "Hide transfers" : "Stock transfers"}</button></div>{panel === "movements" && <StockMovements branches={branches} categories={categories} />}{panel === "transfers" && <InventoryTransfers branches={branches} />}</section>;
}
