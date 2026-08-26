"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrderActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const update = async (status: "ASSIGNED_TO_BRANCH" | "CANCELLED") => {
    if (status === "CANCELLED" && !window.confirm("Cancel this order?")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Unable to update the order.");
      setMessage(status === "CANCELLED" ? "Order cancelled." : "Order accepted.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to update the order.");
    } finally { setBusy(false); }
  };
  return <span><span className="flex gap-2"><button type="button" disabled={busy} onClick={() => update("ASSIGNED_TO_BRANCH")} className="rounded bg-brand px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">Accept</button><button type="button" disabled={busy} onClick={() => update("CANCELLED")} className="rounded border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 disabled:opacity-50">Cancel</button></span>{message && <span role="status" className="mt-1 block text-xs text-[#666]">{message}</span>}</span>;
}
