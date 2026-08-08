"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CategoryHeader } from "@/components/Header";
import {
  ApplePayIcon,
  KnetIcon,
  MastercardIcon,
  VisaIcon,
} from "@/components/PaymentIcons";
import { getMsg } from "@/lib/i18n";
import { useCart, useDelivery, useLang } from "@/lib/state";
import { fmtPrice } from "@/lib/utils";

const field =
  "w-full rounded border border-[#dedede] bg-white px-3 py-2.5 text-[14px] text-ink outline-none focus:border-brand";

const gateways = {
  knet: {
    name: "KNET",
    arName: "كي نت",
    color: "#009639",
    Icon: KnetIcon,
    Logos: KnetIcon,
  },
  credit: {
    name: "Credit Card",
    arName: "بطاقة ائتمان",
    color: "#1a1f71",
    Icon: MastercardIcon,
    Logos: () => (
      <span className="flex items-center gap-1">
        <VisaIcon className="h-6 w-auto" />
        <MastercardIcon className="h-6 w-auto" />
      </span>
    ),
  },
  applepay: {
    name: "Apple Pay",
    arName: "أبل باي",
    color: "#000000",
    Icon: ApplePayIcon,
    Logos: ApplePayIcon,
  },
} as const;

function PaymentInner() {
  const router = useRouter();
  const params = useSearchParams();
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const t = getMsg;
  const total = useCart((s) => s.total());
  const payment = useDelivery((s) => s.payment);
  const method = (payment === "credit" || payment === "applepay" ? payment : "knet") as
    | "knet"
    | "credit"
    | "applepay";
  const gw = gateways[method];

  const order = params.get("order") ?? "";

  const [cardName, setCardName] = useState("Test User");
  const [cardNo, setCardNo] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/29");
  const [cvv, setCvv] = useState("123");
  const [processing, setProcessing] = useState(false);
  const [err, setErr] = useState("");

  const pay = () => {
    if (!cardName.trim() || !cardNo.trim() || !expiry.trim() || !cvv.trim()) {
      setErr(ar ? "يرجى تعبئة بيانات البطاقة" : "Please fill in the card details");
      return;
    }
    setErr("");
    setProcessing(true);
    window.setTimeout(() => {
      router.push(`/checkout/success?order=${order}`);
    }, 1500);
  };

  return (
    <>
      <CategoryHeader title={ar ? `الدفع (تجريبي) - ${gw.arName}` : `Payment (sandbox) - ${gw.name}`} />
      <div className="mx-auto w-full px-4 pb-10 pt-[68px] lg:px-8">
        <p className="mb-3 rounded-[7px] border border-[#ffd86e] bg-[#fff8e1] p-3 text-[12px] leading-5 text-[#8a6d00]">
          {t("sandboxNotice")[ar ? "ar" : "en"]}
        </p>
        <div className="overflow-hidden rounded-[7px] bg-white shadow-sm">
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            style={{ backgroundColor: gw.color }}
          >
            <span className="text-[15px] font-bold">{ar ? gw.arName : gw.name}</span>
            <gw.Logos />
          </div>
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[13px] text-[#666]">{t("total")[ar ? "ar" : "en"]}</span>
              <span className="text-[16px] font-bold text-brand">{fmtPrice(total, lang)}</span>
            </div>
            <label className="mb-1 block text-[13px] font-medium text-[#666]">
              {t("name")[ar ? "ar" : "en"]}
            </label>
            <input value={cardName} onChange={(e) => setCardName(e.target.value)} className={field} />
            <label className="mt-3 mb-1 block text-[13px] font-medium text-[#666]">
              {t("cardNumber")[ar ? "ar" : "en"]}
            </label>
            <input
              value={cardNo}
              onChange={(e) => setCardNo(e.target.value)}
              className={field}
              dir="ltr"
              inputMode="numeric"
            />
            <div className="mt-3 flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-[13px] font-medium text-[#666]">
                  {t("expiry")[ar ? "ar" : "en"]}
                </label>
                <input value={expiry} onChange={(e) => setExpiry(e.target.value)} className={field} dir="ltr" />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[13px] font-medium text-[#666]">
                  {t("cvv")[ar ? "ar" : "en"]}
                </label>
                <input
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  className={field}
                  dir="ltr"
                  inputMode="numeric"
                />
              </div>
            </div>
            {err && <p className="mt-3 text-[12px] text-red-500">{err}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={pay}
          disabled={processing}
          className="mt-5 flex h-12 w-full items-center justify-center rounded bg-[#2ecc71] text-[15px] font-bold text-white disabled:opacity-60"
        >
          {processing ? (ar ? "جاري الدفع..." : "Processing...") : t("pay")[ar ? "ar" : "en"]}
        </button>
      </div>
    </>
  );
}

export default function CheckoutPaymentPage() {
  return (
    <Suspense>
      <PaymentInner />
    </Suspense>
  );
}
