"use client";

import { useEffect, useMemo } from "react";
import { Heart } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { SubHeader } from "@/components/Header";
import { getMsg } from "@/lib/i18n";
import { useLang, useWishlist } from "@/lib/state";
import { useCatalog } from "@/hooks/useCatalog";

export default function FavoritesPage() {
  const lang = useLang((s) => s.lang);
  const t = getMsg;
  const ids = useWishlist((s) => s.ids);
  const setIds = useWishlist((s) => s.setIds);
  const { products } = useCatalog();

  useEffect(() => {
    fetch("/api/customer/wishlist").then((response) => response.ok ? response.json() : null).then((data) => { if (data?.ids) setIds(data.ids); }).catch(() => undefined);
  }, [setIds]);

  const list = useMemo(
    () => products.filter((p) => ids.includes(p.id)),
    [products, ids]
  );

  return (
    <>
      <SubHeader title={t("myFavorites")[lang === "ar" ? "ar" : "en"]} />
      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
          <Heart size={48} className="text-[#ccc]" />
          <p className="text-[15px] text-[#666]">
            {t("noFavorites")[lang === "ar" ? "ar" : "en"]}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 pb-20">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </>
  );
}
