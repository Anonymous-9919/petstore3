"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { getMsg } from "@/lib/i18n";
import { useCart, useLang } from "@/lib/state";
import { discountPercent, fmtPrice, cn } from "@/lib/utils";
import { AddIcon } from "@/components/MuiIcons";

export function DiscountBadge({ product }: { product: Product }) {
  const pct = discountPercent(product.price, product.striked_price);
  if (pct <= 0) return null;
  return (
    <span className="absolute top-2 right-[10px] rounded-[3px] bg-brand px-[5px] py-[1px] text-[16px] font-bold leading-[20px] text-white">
      {pct} %
    </span>
  );
}

function AddToCartButton({ product }: { product: Product }) {
  const lang = useLang((s) => s.lang);
  const add = useCart((s) => s.add);
  const router = useRouter();
  const t = getMsg;

  const handle = () => {
    if (product.options && product.options.length > 0) {
      router.push(`/product/${product.category_slug || "category"}/${product.slug}`);
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
    <button
      type="button"
      onClick={handle}
      className="flex h-[30px] w-[45%] items-center justify-center gap-2 rounded-[4px] border border-brand bg-transparent text-[14px] font-bold text-brand rtl:flex-row-reverse"
    >
      {t("add")[lang === "ar" ? "ar" : "en"]}
      <AddIcon className="h-[18px] w-[18px]" />
    </button>
  );
}

function BuyNowButton({ product }: { product: Product }) {
  const lang = useLang((s) => s.lang);
  const add = useCart((s) => s.add);
  const router = useRouter();
  const t = getMsg;

  const handle = () => {
    if (product.options && product.options.length > 0) {
      router.push(`/product/${product.category_slug || "category"}/${product.slug}`);
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
    router.push("/checkout");
  };

  return (
    <button
      type="button"
      onClick={handle}
      className="flex h-[30px] w-[45%] items-center justify-center whitespace-nowrap rounded-[4px] border border-[#2ecc71] bg-[#2ecc71] text-[14px] font-bold text-white"
    >
      {t("buyNow")[lang === "ar" ? "ar" : "en"]}
    </button>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const name = ar && product.ar_name ? product.ar_name : product.name;
  const short = ar ? product.ar_short_description : product.short_description;
  const discount =
    product.striked_price != null && product.striked_price > product.price;

  return (
    <div className="mb-[42px] w-full px-2">
      <Link
        href={`/product/${product.category_slug || "category"}/${product.slug}`}
        className="block"
      >
        <div
          className="relative h-[240px] w-full rounded-[7px] bg-white bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${product.photo})` }}
          role="img"
          aria-label={name}
        >
          <DiscountBadge product={product} />
        </div>
        <div>
          <p className={cn("mt-[7px] mb-0 h-10 overflow-hidden pr-[3.5px] text-[14px] font-bold leading-5 text-ink", ar ? "text-right" : "text-left")}>
            {name}
          </p>
          <p className={cn("mt-[3px] h-[38px] overflow-hidden pr-[3.5px] text-[14px] leading-5 text-[#333]", ar ? "text-right" : "text-left")}>
            {short}
          </p>
          <div className="pl-[3.5px]">
            <div className={cn("mt-[3px] h-[20px] text-[14px] leading-5 text-brand", ar ? "text-left" : "text-right")}>
              {discount && (
                <span className="mx-2 line-through">
                  {fmtPrice(product.striked_price ?? product.price, lang)}
                </span>
              )}
              <span className="font-bold">
                {fmtPrice(product.price, lang)}
              </span>
            </div>
            <div className={cn("mt-[7px] flex h-[30px] w-full justify-around", ar ? "float-left" : "float-right")}>
              <AddToCartButton product={product} />
              <BuyNowButton product={product} />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
