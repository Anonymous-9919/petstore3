"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/lib/state";

export const dynamic = "force-dynamic";

function SandboxInner() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const router = useRouter();
  const sp = useSearchParams();
  const orderId = sp.get("orderId") || "";
  const token = sp.get("token") || "";
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const response = await fetch("/api/payments/mock/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, trackingToken: token }) });
    const payment = await response.json().catch(() => ({}));
    if (!response.ok) { setLoading(false); return; }
    router.replace(`/checkout/success?order=${encodeURIComponent(payment.orderNumber)}&token=${encodeURIComponent(payment.trackingToken)}`);
  };

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-[#f4f5f5] p-[16px]"
      dir={ar ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-[360px] rounded-[8px] bg-[#ffffff] p-[20px] shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <div className="mb-[12px] text-center text-[18px] font-semibold text-[#222]">
          {ar ? "بوابة الدفع - بيت سواق (اختبار)" : "Secure Payment Gateway (Test Mode)"}
        </div>

        <form onSubmit={handleSubmit} className="space-y-[12px]">
          <div>
            <label className="block text-[12px] text-[#666]">
              {ar ? "رقم البطاقة" : "Card number"}
            </label>
            <input
              type="text"
              defaultValue="4242 4242 4242 4242"
              readOnly
              className="mt-[4px] w-full rounded-[4px] border border-[#d4d4d4] bg-[#f7f7f7] px-[10px] py-[8px] text-[14px] text-[#333] outline-none"
            />
          </div>

          <div className="flex gap-[8px]">
            <div className="w-1/2">
              <label className="block text-[12px] text-[#666]">
                {ar ? "تاريخ الانتهاء" : "Expiry"}
              </label>
              <input
                type="text"
                defaultValue="12/28"
                readOnly
                className="mt-[4px] w-full rounded-[4px] border border-[#d4d4d4] bg-[#f7f7f7] px-[10px] py-[8px] text-[14px] text-[#333] outline-none"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-[12px] text-[#666]">
                {ar ? "رمز الأمان" : "CVV"}
              </label>
              <input
                type="text"
                defaultValue="123"
                readOnly
                className="mt-[4px] w-full rounded-[4px] border border-[#d4d4d4] bg-[#f7f7f7] px-[10px] py-[8px] text-[14px] text-[#333] outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-[8px] w-full rounded-[6px] bg-[#ff6600] py-[10px] text-[14px] font-bold text-[#fff] transition-opacity disabled:opacity-[0.7]"
          >
            {loading
              ? ar
                ? "جارٍ المعالجة..."
                : "Processing..."
              : ar
                ? "دفع"
                : "Pay"}
          </button>

          <p className="pt-[4px] text-center text-[11px] text-[#999]">
            {ar
              ? "هذه بيئة اختبار. لا يتم إجراء أي شحن."
              : "Sandbox mode — no real payment is processed."}
          </p>
        </form>
      </div>
    </div>
  );
}

export default function SandboxPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f4f5f5]">
          <div className="text-[15px] text-[#666]">
            {typeof window !== "undefined"
              ? document.documentElement.dir === "rtl"
                ? "جارٍ التحميل..."
                : "Loading..."
              : "Loading..."}
          </div>
        </div>
      }
    >
      <SandboxInner />
    </Suspense>
  );
}
