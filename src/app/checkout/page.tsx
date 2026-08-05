"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2 } from "lucide-react";
import { SubHeader } from "@/components/Header";
import { getBranches, getBranchAreas } from "@/data/loader";
import { getMsg } from "@/lib/i18n";
import { useCart, useDelivery, useLang } from "@/lib/state";
import { cn, fmtPrice } from "@/lib/utils";

export default function CheckoutPage() {
  const lang = useLang((s) => s.lang);
  const t = getMsg;
  const ar = lang === "ar";
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const total = useCart((s) => s.total());

  const mode = useDelivery((s) => s.mode);
  const branchId = useDelivery((s) => s.branchId);
  const areaId = useDelivery((s) => s.areaId);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [placed, setPlaced] = useState(false);
  const [orderNo] = useState(() => Math.floor(100000 + Math.random() * 900000));

  const deliveryFee = useMemo(() => {
    if (mode !== "delivery" || branchId == null) return null;
    const a = getBranchAreas(branchId).find((x) => x.id === areaId);
    return a ? a.price : null;
  }, [mode, branchId, areaId]);

  const fee = deliveryFee ?? 0;
  const grand = total + fee;
  const branch = getBranches().find((b) => b.id === branchId);

  if (items.length === 0 && !placed) {
    return (
      <>
        <SubHeader title={t("checkout")[ar ? "ar" : "en"]} />
        <div className="px-4 py-20 text-center text-[15px] text-[#666]">
          {t("emptyCart")[ar ? "ar" : "en"]}
        </div>
      </>
    );
  }

  if (placed) {
    return (
      <>
        <SubHeader title={t("checkout")[ar ? "ar" : "en"]} />
        <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
          <CheckCircle2 size={64} className="text-[#2ecc71]" />
          <p className="text-[18px] font-bold text-ink">
            {ar ? "تم استلام طلبك بنجاح" : "Order placed successfully"}
          </p>
          <p className="text-[14px] text-[#666]">
            {ar ? "رقم الطلب" : "Order number"}: <b className="text-ink">{orderNo}</b>
          </p>
          <Link href="/" className="mt-4 rounded bg-brand px-8 py-2.5 text-[14px] font-bold text-white">
            {t("home")[ar ? "ar" : "en"]}
          </Link>
        </div>
      </>
    );
  }

  const placeOrder = () => {
    clear();
    setPlaced(true);
  };

  const field =
    "w-full rounded border border-[#dedede] bg-white px-3 py-2.5 text-[14px] text-ink outline-none focus:border-brand";

  return (
    <>
      <SubHeader title={t("checkout")[ar ? "ar" : "en"]} />
      <div className="px-4 py-3">
        <div className="rounded-[7px] bg-white p-4 shadow-sm">
          <p className="mb-2 text-[13px] font-bold text-ink">
            {t("orderModeNote")[ar ? "ar" : "en"]}
          </p>
          <div className="flex gap-2">
            {(["delivery", "pickup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => useDelivery.getState().setMode(m)}
                className={cn(
                  "flex-1 rounded border py-2 text-[13px] font-bold",
                  mode === m
                    ? "border-brand bg-brand text-white"
                    : "border-[#dedede] bg-white text-[#666]"
                )}
              >
                {t(m)[ar ? "ar" : "en"]}
              </button>
            ))}
          </div>
        </div>

        {mode === "delivery" ? (
          <div className="mt-3 rounded-[7px] bg-white p-4 shadow-sm">
            <p className="mb-2 text-[13px] font-bold text-ink">
              {ar ? "بيانات التوصيل" : "Delivery details"}
            </p>
            {branch && (
              <p className="mb-2 text-[12px] text-[#666]">
                {ar && branch.ar_name ? branch.ar_name : branch.name} —{" "}
                {fee != null ? fmtPrice(fee, lang) : "-"}
              </p>
            )}
            <div className="space-y-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={ar ? "الاسم" : "Name"} className={field} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={ar ? "رقم الهاتف" : "Phone"} className={field} dir="ltr" />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={ar ? "العنوان" : "Address"}
                rows={2}
                className={field}
              />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("specialRemarks")[ar ? "ar" : "en"]}
                rows={2}
                className={field}
              />
            </div>
            <Link
              href="/select/branch"
              className="mt-3 inline-block text-[13px] font-medium text-brand"
            >
              {t("change")[ar ? "ar" : "en"]}
            </Link>
          </div>
        ) : (
          <div className="mt-3 rounded-[7px] bg-white p-4 shadow-sm">
            <p className="mb-2 text-[13px] font-bold text-ink">
              {ar ? "بيانات الاستلام" : "Pickup details"}
            </p>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={ar ? "الاسم" : "Name"} className={field} />
          </div>
        )}

        <div className="mt-3 rounded-[7px] bg-white p-4 shadow-sm">
          <p className="mb-2 text-[13px] font-bold text-ink">
            {t("reviewOrder")[ar ? "ar" : "en"]}
          </p>
          {items.map((it) => (
            <div key={it.key} className="flex items-center justify-between border-b border-[#f5f5f5] py-2 text-[13px]">
              <span className="text-ink">
                {ar && it.ar_name ? it.ar_name : it.name} <b className="text-[#888]">x{it.qty}</b>
              </span>
              <span className="text-ink">{fmtPrice(it.price * it.qty, lang)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between text-[13px] text-[#666]">
            <span>{t("subtotal")[ar ? "ar" : "en"]}</span>
            <span>{fmtPrice(total, lang)}</span>
          </div>
          <div className="flex justify-between text-[13px] text-[#666]">
            <span>{t("deliveryFee")[ar ? "ar" : "en"]}</span>
            <span>{mode === "delivery" && deliveryFee != null ? fmtPrice(fee, lang) : "-"}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-[#eee] pt-2 text-[15px] font-bold text-ink">
            <span>{t("total")[ar ? "ar" : "en"]}</span>
            <span className="text-brand">{fmtPrice(grand, lang)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={placeOrder}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded bg-brand text-[15px] font-bold text-white"
        >
          <Check size={18} />
          {t("placeOrder")[ar ? "ar" : "en"]}
        </button>
      </div>
    </>
  );
}
