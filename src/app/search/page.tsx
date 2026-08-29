"use client";

import { useMemo, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { SubHeader } from "@/components/Header";
import { BackArrowIcon } from "@/components/MuiIcons";
import { getMsg } from "@/lib/i18n";
import { useLang } from "@/lib/state";
import { cn } from "@/lib/utils";
import { useCatalog } from "@/hooks/useCatalog";

export default function SearchPage() {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const t = getMsg;
  const [q, setQ] = useState("");
  const { products } = useCatalog();

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.ar_name || "").toLowerCase().includes(query)
    );
  }, [products, q]);

  return (
    <>
      <div className="hidden lg:block">
        <SubHeader title={t("search")[ar ? "ar" : "en"]} />
      </div>
      <div
        dir={ar ? "rtl" : "ltr"}
        className="fixed top-0 left-0 right-0 z-[1000] flex h-[59px] w-full items-start border-b border-[#dee2e6] bg-white lg:hidden"
        style={{ paddingInlineStart: 10 }}
      >
        <button
          type="button"
          onClick={() => window.history.back()}
          aria-label="Back"
          className="flex h-[50px] w-10 shrink-0 items-center justify-center"
          style={{ marginTop: 4 }}
        >
          <BackArrowIcon
            className={cn("h-[21px] w-[21px] text-ink", !ar && "-scale-x-100")}
          />
        </button>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPlaceholder")[ar ? "ar" : "en"]}
          className="h-[30px] w-[273px] shrink-0 border-0 bg-transparent text-[14px] text-[#000000de] outline-none"
          style={{ marginTop: 14 }}
        />
      </div>

      <div className="hidden px-4 py-3 lg:block">
        <div className="relative">
          <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")[ar ? "ar" : "en"]}
            className="h-11 w-full rounded border border-[#dedede] bg-white pl-10 pr-4 text-[14px] text-ink outline-none focus:border-brand"
          />
          {q && (
            <button
              type="button"
              aria-label="clear"
              onClick={() => setQ("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888]"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-20 pt-[66px] lg:pt-0">
        {q.trim() && results.length === 0 && (
          <p className="py-10 text-center text-[14px] text-[#666]">
            {t("noResults")[ar ? "ar" : "en"]}
          </p>
        )}
        {q.trim() && results.length > 0 && (
          <p className="mb-2 text-[13px] text-[#666]">
            {results.length} {ar ? "منتج" : "products"}
          </p>
        )}
        <div className="grid grid-cols-2">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </>
  );
}
