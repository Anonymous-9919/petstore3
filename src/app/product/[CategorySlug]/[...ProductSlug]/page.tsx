"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { CategoryHeader } from "@/components/Header";
import { AddIcon, MinusIcon, ShareIcon } from "@/components/MuiIcons";
import { getProducts } from "@/data/loader";
import { getMsg } from "@/lib/i18n";
import { useCart, useLang } from "@/lib/state";
import { cn, fmtPrice, sanitizeHtml } from "@/lib/utils";
import { use } from "react";

export default function ProductPage() {
  const params = useParams<{ CategorySlug: string; ProductSlug: string[] }>();
  const router = useRouter();
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const slugs = params?.ProductSlug ?? [];
  const rawSlug = slugs[slugs.length - 1] ?? "";
  const slug = safeDecode(rawSlug);

  const all = use(getProducts());
  const prod = all.find((p) => p.slug === slug);

  const t = getMsg;
  const add = useCart((s) => s.add);

  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [note, setNote] = useState("");
  const [added, setAdded] = useState(false);

  const basePrice = useMemo(() => {
    if (!prod) return 0;
    let p = prod.price;
    for (const o of prod.options || []) {
      const choiceId = selected[o.id];
      const c = (o.choices || []).find((c) => c.id === choiceId);
      if (c) p += c.price;
    }
    return p;
  }, [prod, selected]);

  if (!prod) return <ProductMissing />;

  const name = lang === "ar" && prod.ar_name ? prod.ar_name : prod.name;
  const desc = lang === "ar" ? prod.ar_description || prod.description : prod.description;
  const optCount = (prod.options || []).length;
  const allSelected = (prod.options || []).every((o) => selected[o.id] != null);
  const canAdd = optCount === 0 || allSelected;

  const effective = {
    ...prod,
    price: basePrice,
    note,
    options: (prod.options || []).map((o) => ({
      optionId: o.id,
      choiceId: selected[o.id] ?? null,
      label: o.choices.find((c) => c.id === selected[o.id])?.value ?? "",
    })),
  };

  const handleAdd = (buyNow: boolean) => {
    if (!canAdd) return;
    const key = `${prod.id}-${(effective.options as { choiceId: number | null }[])
      .map((o) => o.choiceId ?? "")
      .join("-")}`;
    add({
      key,
      productId: prod.id,
      slug: prod.slug,
      categorySlug: prod.category_slug,
      name: prod.name,
      ar_name: prod.ar_name,
      photo: prod.photo,
      price: basePrice,
      qty,
      note: note.trim(),
      options: effective.options as { optionId: number; choiceId: number; label: string }[],
    });
    if (buyNow) router.push("/checkout");
    else {
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1500);
    }
  };

  const shareUrl = `https://wa.me/?text=${encodeURIComponent(`${name} - ${fmtPrice(basePrice, lang)}`)}`;

  return (
    <>
      <CategoryHeader />
      <div className="mt-[42px]">
        <div className="h-[550px] w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={prod.photo} alt={name} className="h-full w-full object-contain" />
        </div>

        <div className="border-y border-[#dee2e6] bg-white leading-[30px]">
          <p className={cn("mt-[5px] h-[30px] overflow-hidden text-[14px] font-bold text-[#6c757d]", ar ? "pr-[18px] text-right" : "pl-[14px] text-left")}>
            {name}
          </p>
          <div className="-mt-[7px] flex h-[60px] justify-between">
            <div className="h-[60px]">
              <div className="mt-[14px] h-[30px] w-[150px]">
                <span
                  className={cn("relative whitespace-nowrap text-[14px] font-bold text-brand", ar ? "float-right mr-[21px]" : "float-left ml-[21px]")}
                  style={{ direction: ar ? "rtl" : "ltr" }}
                >
                  {prod.striked_price != null && prod.striked_price > prod.price && (
                    <span className="absolute left-[6px] top-[-15px] text-[11px] line-through">
                      {fmtPrice(prod.striked_price, lang)}
                    </span>
                  )}
                  {fmtPrice(basePrice, lang)}
                </span>
              </div>
            </div>
            <div className="flex h-[60px] items-center">
              <div className="mx-[14px] flex h-[33px] w-[125px] flex-row-reverse items-center justify-evenly rounded-full border border-[#dedede] bg-white">
                <button
                  type="button"
                  aria-label="increase"
                  onClick={() =>
                    setQty((q) => Math.min(prod.max_addable_quantity ?? 999, q + 1))
                  }
                  className="flex h-[28px] w-[30px] items-center justify-center"
                >
                  <AddIcon className="h-[15px] w-[15px] translate-y-[1.5px] text-brand" />
                </button>
                <div className="flex h-[32px] w-[60px] items-center justify-center border-x border-[#dedede] text-brand">
                  {qty}
                </div>
                <button
                  type="button"
                  aria-label="decrease"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-[28px] w-[30px] items-center justify-center"
                >
                  <MinusIcon className="h-[15px] w-[15px] translate-y-[1.5px] text-brand" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className={cn("mx-[14px] mt-[21px] text-[14px] font-bold leading-[20px] text-ink", ar ? "text-right" : "text-left")}>
          {ar ? "الوصف" : "Description"}
        </p>
        <div className="mt-1 border border-[#dee2e6] bg-white">
          <div
            className={cn("product-description mx-[14px] my-[14px] text-[14px] leading-5 text-ink", ar ? "text-right" : "text-left")}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(desc) }}
          />
        </div>

        <div className="mt-[20.5px] border border-[#dee2e6] bg-white pt-[15px]">
          <p className={cn("mr-4 text-[14px] text-[#6c757d]", ar ? "float-right" : "float-left")}>
            {ar ? "ملاحظات" : "Special Requests"}
          </p>
          <div className="px-[31px] pt-[9px]">
            <div className="w-full border-b border-[rgba(0,0,0,0.42)]">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-transparent py-[6px] text-[14px] text-ink outline-none"
              />
            </div>
          </div>
          <div className="h-[8px]" />
        </div>

        <div className="mt-[48px] w-full py-3 text-center">
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-[10px] text-[14px] text-[#969696]"
          >
            <ShareIcon className="h-[21px] w-[21px] text-[#bababa]" />
            SHARE WITH A FRIEND
          </a>
        </div>

        {optCount > 0 && (
          <div className="mt-5 px-4">
            <h2 className="mb-2 text-[14px] font-bold text-ink">
              {t("selectVariant")[lang === "ar" ? "ar" : "en"]}
            </h2>
            {(prod.options || []).map((o) => (
              <div key={o.id} className="mb-4">
                <p className="mb-2 text-[13px] text-[#666]">
                  {lang === "ar" ? o.ar_name || o.name : o.name}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {o.choices.map((c) => {
                    const active = selected[o.id] === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelected((s) => ({ ...s, [o.id]: c.id }))}
                        className={cn(
                          "relative flex h-[86px] flex-col items-center justify-center gap-1 rounded-[7px] border bg-white",
                          active ? "border-brand" : "border-[#dedede]"
                        )}
                      >
                        {c.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.photo} alt="" className="h-12 w-12 object-contain" />
                        ) : (
                          <span className="text-[13px] text-ink">
                            {lang === "ar" ? c.ar_value || c.value : c.value}
                          </span>
                        )}
                        {c.photo && (
                          <span className="text-[11px] text-[#666]">
                            {lang === "ar" ? c.ar_value || c.value : c.value}
                          </span>
                        )}
                        {active && (
                          <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                            <Check size={12} className="text-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="h-[50px]" />
      </div>

      {!prod.hide_buy_button && (
        <div
          dir="ltr"
          className={cn(
            "fixed bottom-0 z-[1000] h-[60px] w-full bg-white pt-[5px] pb-[10px] lg:w-[calc(100%*5/12)]",
            ar ? "lg:right-0" : "lg:left-0"
          )}
        >
          <div className="flex h-full items-start gap-[4px] px-[7px]">
            {ar ? (
              <>
                <button
                  type="button"
                  onClick={() => handleAdd(true)}
                  className="relative flex h-[45px] w-[calc((100%-4px)/2)] items-center justify-end rounded-[4px] bg-[#2ecc71] pr-4 font-medium"
                >
                  <span
                    className="absolute left-[10px] top-[6px] h-[32px] rounded-[7px] bg-black/30 px-[7px] text-[11.2px] leading-[34px] text-white"
                    style={{ direction: "rtl" }}
                  >
                    {fmtPrice(basePrice, lang)}
                  </span>
                  <span className="text-[14px] font-medium leading-[24.5px] text-white">
                    {t("buyNow").ar}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAdd(false)}
                  className="flex h-[45px] w-[calc((100%-4px)/2)] items-center justify-center rounded-[4px] bg-brand text-[12.25px] font-medium leading-[21.44px] text-black/[0.87]"
                >
                  {t("addToCart").ar}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleAdd(false)}
                  className="flex h-[45px] w-[calc((100%-4px)/2)] items-center justify-center rounded-[4px] bg-brand text-[12.25px] font-medium leading-[21.44px] text-black/[0.87]"
                >
                  {t("addToCart").en}
                </button>
                <button
                  type="button"
                  onClick={() => handleAdd(true)}
                  className="relative flex h-[45px] w-[calc((100%-4px)/2)] items-center justify-start rounded-[4px] bg-[#2ecc71] pl-4 font-medium"
                >
                  <span
                    className="absolute right-[10px] top-[6px] h-[32px] rounded-[7px] bg-black/30 px-[7px] text-[11.2px] leading-[34px] text-white"
                    style={{ direction: "ltr" }}
                  >
                    {fmtPrice(basePrice, lang)}
                  </span>
                  <span className="text-[14px] font-medium leading-[24.5px] text-white">
                    {t("buyNow").en}
                  </span>
                </button>
              </>
            )}
          </div>
          {added && (
            <p className="absolute inset-x-0 bottom-[62px] text-center text-[12px] text-[#2ecc71]">
              {lang === "ar" ? "تمت الاضافة للسلة" : "Added to cart"}
            </p>
          )}
        </div>
      )}
    </>
  );
}

function ProductMissing() {
  const lang = useLang((s) => s.lang);
  return (
    <>
      <CategoryHeader />
      <div className="px-4 py-20 text-center text-[14px] text-[#666]">
        {lang === "ar" ? "المنتج غير موجود" : "Product not found"}
      </div>
    </>
  );
}

function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
