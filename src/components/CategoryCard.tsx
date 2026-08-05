"use client";

import Link from "next/link";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/state";

export default function CategoryCard({ category }: { category: Category }) {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const name = ar && category.ar_name ? category.ar_name : category.name;
  return (
    <Link
      href={`/category/${category.slug}`}
      className="block w-full pb-[21px] odd:pl-[7px] odd:pr-[6px] even:pl-[6px] even:pr-[7px]"
    >
      <div
        className="h-[216px] w-full rounded-[7px] border border-white bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${category.photo})` }}
        role="img"
        aria-label={name}
      />
      <p className={cn("mt-[7px] mr-[4px] truncate text-[15.5px] font-semibold leading-[22px] text-ink", ar ? "text-right" : "text-left")}>
        {name}
      </p>
    </Link>
  );
}
