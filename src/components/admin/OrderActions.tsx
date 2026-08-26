"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrderActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const update = async (status: "ASSIGNED_TO_BRANCH" | "CANCELLED") => {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (response.ok) router.refresh();
    } finally { setBusy(false); }
  };
  return <span className="flex gap-2"><button disabled={busy} onClick={() => update("ASSIGNED_TO_BRANCH")} className="rounded bg-brand px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">Accept</button><button disabled={busy} onClick={() => update("CANCELLED")} className="rounded border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 disabled:opacity-50">Cancel</button></span>;
}
