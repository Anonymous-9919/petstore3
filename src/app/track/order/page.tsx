"use client";

import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { SubHeader } from "@/components/Header";
import { useLang } from "@/lib/state";

export default function TrackOrderPage() {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const [orderNo, setOrderNo] = useState("");
  const [error, setError] = useState("");
  const [order, setOrder] = useState<{ orderNumber: string; status: string; paymentStatus: string; total: string; currencyCode: string; createdAt: string; statusHistory: { toStatus: string; note: string | null; createdAt: string }[] } | null>(null);

  async function track(value = orderNo) {
    setError("");
    setOrder(null);
    const response = await fetch(`/api/customer/orders/${encodeURIComponent(value.trim())}`);
    if (!response.ok) { const body = await response.json().catch(() => ({})); setError(body.error || "Order not found."); return; }
    setOrder(await response.json());
  }
  useEffect(() => {
    const number = new URLSearchParams(window.location.search).get("number");
    if (number) { setOrderNo(number); void track(number); }
  }, []);

  return (
    <>
      <SubHeader title={ar ? "تتبع الطلب" : "Track Order"} />
      <div className="px-4 py-4">
        <div className="rounded-[7px] bg-white p-4 shadow-sm">
          <p className="mb-2 text-[13px] font-bold text-ink">
            {ar ? "رقم الطلب" : "Order number"}
          </p>
          <input
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            dir="ltr"
            placeholder="123456"
            className="w-full rounded border border-[#dedede] bg-white px-3 py-2.5 text-[14px] text-ink outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={() => void track()}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded bg-brand text-[14px] font-bold text-white"
          >
            <Truck size={18} />
            {ar ? "تتبع" : "Track"}
          </button>
          {error && <p className="mt-3 text-center text-[13px] text-[#d63b32]">{error}</p>}
          {order && <div className="mt-4 border-t border-[#eee] pt-4"><div className="flex justify-between text-[14px] font-bold text-ink"><span dir="ltr">{order.orderNumber}</span><span className="text-brand">{order.status.replaceAll("_", " ")}</span></div><p className="mt-2 text-[13px] text-[#666]">{ar ? "حالة الدفع" : "Payment"}: {order.paymentStatus.replaceAll("_", " ")}</p><p className="mt-1 text-[13px] text-[#666]">{ar ? "الإجمالي" : "Total"}: {order.total} {order.currencyCode}</p>{order.statusHistory.map((item) => <div key={`${item.toStatus}-${item.createdAt}`} className="mt-3 border-l-2 border-brand pl-3 text-[13px] text-[#666]"><p className="font-bold text-ink">{item.toStatus.replaceAll("_", " ")}</p><p>{item.note}</p><p>{new Date(item.createdAt).toLocaleString()}</p></div>)}</div>}
        </div>
      </div>
    </>
  );
}
