"use client";

import { useState } from "react";
import { Truck } from "lucide-react";
import { SubHeader } from "@/components/Header";
import { useLang } from "@/lib/state";

export default function TrackOrderPage() {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const [orderNo, setOrderNo] = useState("");
  const [submitted, setSubmitted] = useState(false);

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
            onClick={() => setSubmitted(true)}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded bg-brand text-[14px] font-bold text-white"
          >
            <Truck size={18} />
            {ar ? "تتبع" : "Track"}
          </button>
          {submitted && (
            <p className="mt-3 text-center text-[13px] text-[#666]">
              {ar
                ? "لا يوجد طلب بهذا الرقم"
                : "No order found with this number"}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
