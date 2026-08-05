"use client";

import Link from "next/link";
import { storeData } from "@/data/loader";
import { GridViewIcon, InfoIcon, PackageIcon } from "@/components/MuiIcons";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/state";

export default function StoreInfoMobile() {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const name = ar ? storeData.ar_name.trim() : storeData.name;
  const slogan = ar ? storeData.ar_slogan : storeData.slogan;

  return (
    <div
      className="flex items-start bg-white lg:hidden"
      style={{
        paddingTop: 3.5,
        paddingBottom: 4,
        paddingInlineStart: ar ? 30 : 15,
        paddingInlineEnd: 0,
        marginTop: 3,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={storeData.logo}
        alt=""
        className="h-[60px] w-[60px] shrink-0 rounded-[4px] object-cover"
        style={{ marginTop: 8 }}
      />
      <div
        className="min-w-0 flex-1 self-center"
        style={{
          paddingTop: 4,
          paddingBottom: 4,
          paddingInlineStart: 14,
          marginInlineEnd: ar ? 15 : 0,
        }}
      >
        <p className="truncate text-[14px] font-bold leading-[20px] text-black">{name}</p>
        <p
          className={cn(
            "text-[12.6px] leading-[18px] text-[#5f5f5f]",
            !ar && "truncate"
          )}
        >
          {slogan}
        </p>
        <div className="mt-[9px] flex items-start gap-[10px] text-[#37ad49]">
          <GridViewIcon className="h-[21px] w-[21px]" />
          <PackageIcon className="h-[20px] w-[20px]" />
        </div>
      </div>
      <Link
        href="/contact"
        aria-label="Contact"
        className="flex w-14 shrink-0 items-center justify-center self-center text-black/[0.54]"
      >
        <InfoIcon className="h-[21px] w-[21px]" />
      </Link>
    </div>
  );
}
