"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { FsState } from "@/components/FilterSort";
import { AddIcon } from "@/components/MuiIcons";
import { categoryList, sortCategories } from "@/data/loader";
import { getMsg } from "@/lib/i18n";
import { useCart, useLang, useLocationSet } from "@/lib/state";
import type { Category, Product } from "@/lib/types";
import { cn, discountPercent, fmtPrice } from "@/lib/utils";

function ProductListRow({ product }: { product: Product }) {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const add = useCart((s) => s.add);
  const locationSet = useLocationSet();
  const router = useRouter();
  const t = getMsg;

  const name = ar && product.ar_name ? product.ar_name : product.name;
  const short = ar ? product.ar_short_description : product.short_description;
  const pct = discountPercent(product.price, product.striked_price);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.options && product.options.length > 0) {
      router.push(`/product/${product.category_slug || "category"}/${product.slug}`);
      return;
    }
    if (!locationSet) {
      router.push("/select/branch");
      return;
    }
    add({
      key: String(product.id),
      productId: product.id,
      slug: product.slug,
      categorySlug: product.category_slug,
      name: product.name,
      ar_name: product.ar_name,
      photo: product.photo,
      price: product.price,
      note: "",
      options: [],
    });
  };

  return (
    <Link href={`/product/${product.category_slug || "category"}/${product.slug}`}>
      <li
        dir="ltr"
        className="relative ml-0 flex items-center py-2 pl-[20px] pr-4"
        style={{ marginBottom: 42 }}
      >
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.photo}
            alt=""
            className="image_menu"
            style={{
              width: 90,
              minWidth: 90,
              minHeight: 90,
              height: 90,
              borderRadius: 5,
              marginRight: 15,
              marginLeft: 0,
            }}
          />
          {pct > 0 && (
            <span className="discount-sign absolute left-[5px] top-2 rounded-[3px] bg-[#ff6600] px-[5px] py-[1px] text-[13px] font-bold leading-[20px] text-white">
              {pct} %
            </span>
          )}
        </div>
        <div className={cn("text-left", ar && "text-right")} style={{ marginRight: 20 }}>
          <h6
            className="w-full truncate text-[14px] font-bold text-[rgba(0,0,0,0.87)]"
            style={{
              fontFamily: "Quicksand, Cairo",
              direction: ar ? "rtl" : "ltr",
              paddingRight: 3,
              lineHeight: "16.8px",
              marginBottom: 7,
            }}
          >
            {name}
          </h6>
          <p
            className="w-full overflow-hidden text-[14px] leading-5 text-[#333]"
            style={{ top: -5, height: 40, paddingRight: 3, position: "relative" }}
          >
            {short}
          </p>
          <p
            className="priceEnglish absolute flex h-[30px] items-center text-[#ff6600]"
            style={{ right: 20, bottom: 2 }}
          >
            <div className="relative whitespace-nowrap">
              {product.striked_price != null && product.striked_price > product.price && (
                <span
                  className="relative flex text-[12px] leading-none text-[#ff6600] line-through"
                  style={{ right: 4 }}
                >
                  {fmtPrice(product.striked_price, lang)}
                </span>
              )}
              <span className="font-bold">{fmtPrice(product.price, lang)}</span>
            </div>
            <div className="ml-3">
              <button
                type="button"
                onClick={handleAdd}
                className="mx-auto inline-flex h-[30px] items-center justify-center rounded-[4px] border border-[#ff6600] bg-transparent px-[9px] text-[14px] font-bold text-[#ff6600]"
                style={{ textTransform: "none" }}
              >
                <AddIcon className="mr-2 h-[18px] w-[18px]" />
                <span>{t("add")[ar ? "ar" : "en"]}</span>
              </button>
            </div>
          </p>
        </div>
      </li>
    </Link>
  );
}

export default function SortedProductList({
  products,
  state,
}: {
  products: Product[];
  state: FsState;
}) {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";

  const groups = useMemo(() => {
    const selectedSlugs = new Set(
      categoryList.filter((c) => state.catFilter.length === 0 || state.catFilter.includes(c.id)).map((c) => c.slug)
    );

    let list = products.filter((p) => selectedSlugs.has(p.category_slug));
    if (state.availableOnly) list = list.filter((p) => !p.not_available);
    if (state.priceRange) {
      const [lo, hi] = state.priceRange;
      list = list.filter((p) => p.price >= lo && p.price <= hi);
    }

    const bySlug = new Map<string, Category>();
    for (const c of sortCategories(categoryList)) bySlug.set(c.slug, c);

    const result: { cat: Category; items: Product[] }[] = [];
    for (const c of bySlug.values()) {
      const items = list
        .filter((p) => p.category_slug === c.slug)
        .sort((a, b) => {
          const s = state.sort;
          if (!s) return 0;
          const dirn = s.dir === "asc" ? 1 : -1;
          if (s.group === "price") return (a.price - b.price) * dirn;
          if (s.group === "name") {
            const na = ar && a.ar_name ? a.ar_name : a.name;
            const nb = ar && b.ar_name ? b.ar_name : b.name;
            return na.localeCompare(nb, ar ? "ar" : "en") * dirn;
          }
          const da = a.published_date ? new Date(a.published_date).getTime() : a.id;
          const db = b.published_date ? new Date(b.published_date).getTime() : b.id;
          return (da - db) * dirn;
        });
      if (items.length > 0) result.push({ cat: c, items });
    }
    return result;
  }, [products, state, ar]);

  if (groups.length === 0) {
    return (
      <p className="px-4 pb-20 text-center text-[14px] text-[#666]">
        {ar ? "لا توجد منتجات" : "No products found"}
      </p>
    );
  }

  return (
    <div>
      {groups.map((g) => (
        <div key={g.cat.id} className="mb-5 w-full">
          <div>
            <div className="sticky-category relative z-[11] h-[50px]">
              <div id={`navigate${g.cat.id}`} style={{ width: "100%" }} />
              <div className="category_menu my-auto pt-[16px]">
                <h5
                  className="m-0 w-full px-4 text-[14px] font-bold leading-[18px] text-[rgba(0,0,0,0.87)]"
                  style={{ fontFamily: "Quicksand" }}
                >
                  {ar && g.cat.ar_name ? g.cat.ar_name : g.cat.name}
                </h5>
              </div>
            </div>
            <nav
              className="MuiList-root MuiList-padding"
              aria-label="main mailbox folders"
              style={{ width: "100%", backgroundColor: "white", paddingBottom: 8, paddingTop: 8 }}
            >
              {g.items.map((p) => (
                <ProductListRow key={p.id} product={p} />
              ))}
            </nav>
          </div>
        </div>
      ))}
    </div>
  );
}
