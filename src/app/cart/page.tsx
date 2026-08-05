"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { CategoryHeader, SubHeader, MobilePageHeader } from "@/components/Header";
import { getMsg } from "@/lib/i18n";
import { useCart, useDelivery, useLang } from "@/lib/state";
import { fmtPrice } from "@/lib/utils";
import { getBranches, getBranchAreas } from "@/data/loader";
import { useMemo } from "react";

export default function CartPage() {
  const lang = useLang((s) => s.lang);
  const t = getMsg;
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const total = useCart((s) => s.total());
  const mode = useDelivery((s) => s.mode);
  const branchId = useDelivery((s) => s.branchId);
  const areaId = useDelivery((s) => s.areaId);

  const deliveryFee = useMemo(() => {
    if (mode !== "delivery" || branchId == null) return null;
    const areas = getBranchAreas(branchId);
    const area = areas.find((a) => a.id === areaId);
    return area ? area.price : null;
  }, [mode, branchId, areaId]);

  const fee = deliveryFee ?? 0;
  const grand = total + fee;

  if (items.length === 0) {
    return (
      <>
        <MobilePageHeader title={t("myCart")[lang === "ar" ? "ar" : "en"]} />
        <div className="hidden lg:block">
          <SubHeader title={t("myCart")[lang === "ar" ? "ar" : "en"]} />
        </div>
        <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
          <ShoppingCart size={48} className="text-[#ccc]" />
          <p className="text-[15px] text-[#666]">{t("emptyCart")[lang === "ar" ? "ar" : "en"]}</p>
          <Link
            href="/"
            className="rounded bg-brand px-6 py-2 text-[14px] font-bold text-white"
          >
            {t("startShopping")[lang === "ar" ? "ar" : "en"]}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <MobilePageHeader title={t("myCart")[lang === "ar" ? "ar" : "en"]} />
      <div className="hidden lg:block">
        <SubHeader title={t("myCart")[lang === "ar" ? "ar" : "en"]} />
      </div>
      <div className="px-4 py-3 lg:pt-0 pt-[55px]">
        <ul className="space-y-3">
          {items.map((it) => {
            const name = lang === "ar" && it.ar_name ? it.ar_name : it.name;
            const variant = it.options.map((o) => o.label).filter(Boolean).join(", ");
            return (
              <li key={it.key} className="flex gap-3 rounded-[7px] bg-white p-3 shadow-sm">
                <Link
                  href={`/product/${it.categorySlug}/${it.slug}`}
                  className="block h-[72px] w-[72px] shrink-0 rounded bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${it.photo})` }}
                  aria-label={name}
                />
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/product/${it.categorySlug}/${it.slug}`}
                      className="text-[14px] font-bold text-ink"
                    >
                      {name}
                    </Link>
                    <button
                      type="button"
                      aria-label="remove"
                      onClick={() => remove(it.key)}
                      className="text-[#999]"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {variant && <p className="text-[12px] text-[#666]">{variant}</p>}
                  {it.note && <p className="text-[12px] text-[#888]">{it.note}</p>}
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <div className="flex items-center rounded border border-[#dedede]">
                      <button
                        type="button"
                        aria-label="decrease"
                        onClick={() => setQty(it.key, it.qty - 1)}
                        className="flex h-8 w-8 items-center justify-center text-ink"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-[14px] font-bold text-ink">{it.qty}</span>
                      <button
                        type="button"
                        aria-label="increase"
                        onClick={() => setQty(it.key, it.qty + 1)}
                        className="flex h-8 w-8 items-center justify-center text-ink"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="text-[15px] font-bold text-brand">
                      {fmtPrice(it.price * it.qty, lang)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 rounded-[7px] bg-white p-4 shadow-sm">
          <div className="flex justify-between text-[14px] text-ink">
            <span>{t("subtotal")[lang === "ar" ? "ar" : "en"]}</span>
            <span>{fmtPrice(total, lang)}</span>
          </div>
          <div className="mt-1 flex justify-between text-[14px] text-ink">
            <span>{t("deliveryFee")[lang === "ar" ? "ar" : "en"]}</span>
            <span>{mode === "delivery" && deliveryFee != null ? fmtPrice(fee, lang) : "-"}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-[#eee] pt-2 text-[15px] font-bold text-ink">
            <span>{t("total")[lang === "ar" ? "ar" : "en"]}</span>
            <span className="text-brand">{fmtPrice(grand, lang)}</span>
          </div>
        </div>

        <Link
          href="/checkout"
          className="mt-4 flex h-12 w-full items-center justify-center rounded bg-brand text-[15px] font-bold text-white"
        >
          {t("goToCheckout")[lang === "ar" ? "ar" : "en"]}
        </Link>
      </div>
    </>
  );
}
