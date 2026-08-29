"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { CategoryHeader } from "@/components/Header";
import { getMsg } from "@/lib/i18n";
import { useCart, useLang } from "@/lib/state";

function SuccessInner() {
  const params = useSearchParams();
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const t = getMsg;
  const clear = useCart((s) => s.clear);

  const [orderNo] = useState(() => params.get("order") ?? "");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const token = params.get("token");
    if (!orderNo || !token) return;
    fetch(`/api/orders/${encodeURIComponent(orderNo)}?token=${encodeURIComponent(token)}`)
      .then((response) => {
        if (!response.ok) throw new Error("Order was not confirmed.");
        clear();
        setConfirmed(true);
      })
      .catch(() => setConfirmed(false));
  }, [clear, orderNo, params]);

  return (
    <>
      <CategoryHeader title={t("checkout")[ar ? "ar" : "en"]} />
      <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
        <CheckCircle2 size={64} className={confirmed ? "text-[#2ecc71]" : "text-[#999]"} />
        <p className="text-[18px] font-bold text-ink">{confirmed ? t("orderPlaced")[ar ? "ar" : "en"] : (ar ? "جارٍ التحقق من الطلب" : "Verifying your order")}</p>
        {confirmed && <p className="text-[14px] text-[#666]">{t("orderNumber")[ar ? "ar" : "en"]}: <b className="text-ink">{orderNo}</b></p>}
        <Link
          href="/"
          className="mt-4 rounded bg-brand px-8 py-2.5 text-[14px] font-bold text-white"
        >
          {t("home")[ar ? "ar" : "en"]}
        </Link>
      </div>
    </>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}
