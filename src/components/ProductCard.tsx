"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { getMsg } from "@/lib/i18n";
import { deliveryAddressComplete, useCart, useDelivery, useLang, useLocationSet } from "@/lib/state";
import { discountPercent, fmtPrice, cn } from "@/lib/utils";
import { AddIcon, MinusIcon } from "@/components/MuiIcons";

export function DiscountBadge({ product }: { product: Product }) {
  const pct = discountPercent(product.price, product.striked_price);
  if (pct <= 0) return null;
  return (
    <span className="absolute top-2 right-[10px] rounded-[3px] bg-brand px-[5px] py-[1px] text-[16px] font-bold leading-[20px] text-white">
      {pct} %
    </span>
  );
}

function QtyStepper({ product }: { product: Product }) {
  const setQty = useCart((s) => s.setQty);
  const items = useCart((s) => s.items);
  const item = items.find((i) => i.key === String(product.id));
  const qty = item?.qty ?? 0;

  const onMinus = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQty(String(product.id), qty - 1);
  };
  const onPlus = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQty(String(product.id), qty + 1);
  };

  return (
    <div
      className="mx-auto flex h-[30px] w-full items-center justify-around"
      style={{ direction: "ltr" }}
    >
      <button
        type="button"
        aria-label="decrease"
        onClick={onMinus}
        className="flex h-[30px] w-[30px] items-center justify-center"
      >
        <MinusIcon className="h-[20px] w-[20px] text-brand" />
      </button>
      <div
        className="min-w-[30px] rounded-[5px] border-[0.5px] border-[#dedede] px-[6px] py-[1px] text-center text-[14px] font-bold text-brand"
        style={{ borderWidth: 0.5 }}
      >
        {qty}
      </div>
      <button
        type="button"
        aria-label="increase"
        onClick={onPlus}
        className="flex h-[30px] w-[30px] items-center justify-center"
      >
        <AddIcon className="h-[20px] w-[20px] text-brand" />
      </button>
    </div>
  );
}

function AddToCartButton({ product }: { product: Product }) {
  const lang = useLang((s) => s.lang);
  const add = useCart((s) => s.add);
  const locationSet = useLocationSet();
  const router = useRouter();
  const t = getMsg;

  const handle = (e: React.MouseEvent) => {
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
  const locationSet = useLocationSet();
  const mode = useDelivery((s) => s.mode);
  const name = useDelivery((s) => s.name);
  const phone = useDelivery((s) => s.phone);
  const block = useDelivery((s) => s.block);
  const street = useDelivery((s) => s.street);
  const building = useDelivery((s) => s.building);
  const router = useRouter();
  const t = getMsg;

  const handle = (e: React.MouseEvent) => {
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
    if (!name.trim() || !phone.trim()) {
      router.push("/checkout/details");
    } else if (
      mode === "delivery" &&
      !deliveryAddressComplete({ block, street, building })
    ) {
      router.push("/checkout/address");
    } else {
      router.push("/checkout/confirmation");
    }
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
  const items = useCart((s) => s.items);
  const inCart = items.some((i) => i.key === String(product.id));

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
            {inCart ? (
              <div className="mt-[7px] w-full">
                <QtyStepper product={product} />
              </div>
            ) : (
              <div className={cn("mt-[7px] flex h-[30px] w-full justify-around", ar ? "float-left" : "float-right")}>
                <AddToCartButton product={product} />
                <BuyNowButton product={product} />
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
