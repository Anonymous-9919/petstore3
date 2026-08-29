"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { CategoryHeader } from "@/components/Header";
import AreaBottomBar from "@/components/AreaBottomBar";
import { useLang } from "@/lib/state";
import { useCatalog } from "@/hooks/useCatalog";

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const lang = useLang((s) => s.lang);
  const { categories, products } = useCatalog();
  const cat = categories.find((category) => category.slug === slug);
  const list = useMemo(
    () => products.filter((p) => p.category_slug === slug),
    [products, slug]
  );

  return (
    <>
      <CategoryHeader title={cat ? (lang === "ar" && cat.ar_name ? cat.ar_name : cat.name) : ""} />
      <div className="h-[80px]" />
      {list.length === 0 ? (
        <p className="px-4 pb-20 text-center text-[14px] text-[#666]">
          {lang === "ar" ? "لا توجد منتجات" : "No products"}
        </p>
      ) : (
        <div className="grid grid-cols-2 px-[6px]">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
      <div className="h-[115px]" />
      <AreaBottomBar />
    </>
  );
}
