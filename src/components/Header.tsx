"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, ShoppingCart, User } from "lucide-react";
import {
  GridViewIcon,
  HistoryIcon,
  InfoIcon,
  PackageBagIcon,
  PackageIcon,
  BackArrowIcon,
  SearchIcon,
} from "@/components/MuiIcons";
import { storeData } from "@/data/loader";
import { useCart, useLang } from "@/lib/state";
import { getMsg } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LangToggle({ className }: { className?: string }) {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const next = lang === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label="Toggle language"
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border border-[#dedede] bg-white text-[12.25px] font-medium text-[#000000de]",
        className
      )}
    >
      {next === "en" ? "En" : "ع"}
    </button>
  );
}

export function CartButton({ className }: { className?: string }) {
  const count = useCart((s) => s.count());
  return (
    <Link
      href="/cart"
      aria-label="Cart"
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-full border border-[#dedede] bg-white",
        className
      )}
    >
      <ShoppingCart size={20} className="text-[#333]" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

export function AccountButton({ className }: { className?: string }) {
  return (
    <Link
      href="/profile"
      aria-label="Account"
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border border-[#dedede] bg-white",
        className
      )}
    >
      <User size={20} className="text-[#333]" />
    </Link>
  );
}

export function SearchButton({ className }: { className?: string }) {
  return (
    <Link
      href="/search"
      aria-label="Search"
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border border-[#dedede] bg-white",
        className
      )}
    >
      <Search size={20} className="text-[#333]" />
    </Link>
  );
}

export function HistoryButton({ className }: { className?: string }) {
  return (
    <Link
      href="/profile/orders"
      aria-label="Orders"
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border border-[#dedede] bg-white",
        className
      )}
    >
      <HistoryIcon className="h-[21px] w-[21px] text-[#333]" />
    </Link>
  );
}

export function MobilePageHeader({ title }: { title: string }) {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const setLang = useLang((s) => s.setLang);
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[1000] flex h-[55px] w-full items-center justify-between border-b border-[#dee2e6] bg-white px-[10px] lg:hidden"
      dir={ar ? "rtl" : "ltr"}
    >
      <button
        type="button"
        onClick={() => window.history.back()}
        aria-label="Back"
        className="flex h-[51px] w-10 shrink-0 items-center justify-center"
      >
        <BackArrowIcon
          className={cn("h-[21px] w-[21px] text-ink", !ar && "-scale-x-100")}
        />
      </button>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ height: 55 }}>
        <h1 className="text-[16px] font-medium text-ink">{title}</h1>
      </div>
      <button
        type="button"
        onClick={() => setLang(ar ? "en" : "ar")}
        aria-label="Toggle language"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[4px] text-[14px] font-medium text-black",
          "h-[50px]",
          ar ? "w-[42px]" : "w-10"
        )}
        style={{ padding: "6px 8px 15px" }}
      >
        {ar ? "En" : "ع"}
      </button>
    </div>
  );
}

export function MobileHeader() {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const setLang = useLang((s) => s.setLang);
  const count = useCart((s) => s.count());
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY >= 650);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[1000] flex w-full items-start justify-between bg-white px-[10px] pt-[4px]",
        scrolled ? "h-[55px] border-b border-[#dee2e6]" : "h-[54px]"
      )}
      dir={ar ? "rtl" : "ltr"}
    >
      {scrolled && (
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[45px] w-[50px] -translate-x-1/2"
        >
          <div className="animated flipInY flex h-full w-full items-start justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={storeData.logo}
              alt=""
              className="object-cover"
              style={{ width: 36, height: 39, marginTop: 7 }}
            />
          </div>
        </div>
      )}
      <Link
        href="/cart"
        aria-label="Cart"
        className="relative flex h-[50px] w-10 items-center justify-center rounded-[4px]"
      >
        <PackageBagIcon className="h-[24px] w-[24px] text-black" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
            {count}
          </span>
        )}
      </Link>
      <div className="flex items-start">
        <Link
          href="/profile/orders"
          aria-label="Orders"
          className="flex h-[50px] w-10 items-center justify-center rounded-[4px]"
        >
          <HistoryIcon className="h-[21px] w-[21px] text-black/[0.87]" />
        </Link>
        <Link
          href="/search"
          aria-label="Search"
          className="flex h-[50px] w-10 items-center justify-center rounded-[4px]"
        >
          <SearchIcon className="h-[21px] w-[21px] text-black" />
        </Link>
        <button
          type="button"
          onClick={() => setLang(ar ? "en" : "ar")}
          aria-label="Toggle language"
          className={cn(
            "flex items-center justify-center rounded-[4px] text-[14px] font-medium text-black",
            "h-[50px]",
            ar ? "w-[42px]" : "w-10"
          )}
          style={{ padding: "6px 8px 15px" }}
        >
          {ar ? "En" : "ع"}
        </button>
      </div>
    </div>
  );
}

export function HomeHeader() {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const name = ar ? storeData.ar_name.trim() : storeData.name;
  const slogan = ar ? storeData.ar_slogan : storeData.slogan;

  return (
    <div className="w-full bg-white">
      <div className="lg:hidden">
        <MobileHeader />
      </div>
      <Link
        href="/"
        className={cn(
          "relative hidden h-[88px] w-full items-start pl-[15px] transition-colors duration-150 hover:bg-black/[0.04] lg:flex",
          ar ? "justify-end" : "justify-start pr-[15px]"
        )}
      >
        <div
          className={cn(
            "min-w-0 pt-[13px]",
            ar ? "mr-3 w-[425px]" : "ml-[74px] w-[425px] grow"
          )}
        >
          <p className="truncate text-[14px] font-bold leading-[20px] text-black">{name}</p>
          <p className="truncate text-[12.6px] leading-[16px] text-[#5f5f5f]">{slogan}</p>
          <div className="mt-[10px] flex items-start gap-[10px] text-[#37ad49]">
            <GridViewIcon className="h-[21px] w-[21px]" />
            <PackageIcon className="h-[20px] w-[20px]" />
          </div>
        </div>
        <div className="flex w-[56px] justify-end pt-[35px] text-black/[0.54]">
          <Link href="/contact" aria-label="Contact">
            <InfoIcon className="h-[21px] w-[21px]" />
          </Link>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={storeData.logo}
          alt=""
          className="absolute left-[15px] top-[15px] h-[60px] w-[60px] object-cover rtl:right-[30px] rtl:left-auto"
        />
      </Link>
    </div>
  );
}

function MobileSubHeader({
  title,
  showSearch,
}: {
  title?: string;
  showSearch: boolean;
}) {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const setLang = useLang((s) => s.setLang);
  return (
    <div
      className="relative flex h-[55px] w-full items-start justify-between border-b border-[#dee2e6] bg-white px-[10px] pt-[4px]"
      dir={ar ? "ltr" : "rtl"}
    >
      <div className="flex items-start">
        <button
          type="button"
          onClick={() => setLang(ar ? "en" : "ar")}
          aria-label="Toggle language"
          className={cn(
            "flex h-[50px] items-center justify-center rounded-[4px] text-[14px] font-medium text-black",
            ar ? "w-[42px]" : "w-10"
          )}
          style={{ padding: "6px 8px 15px" }}
        >
          {ar ? "En" : "ع"}
        </button>
        {showSearch && (
          <Link
            href="/search"
            aria-label="Search"
            className="flex h-[50px] w-10 items-center justify-center rounded-[4px]"
          >
            <SearchIcon className="h-[21px] w-[21px] text-black" />
          </Link>
        )}
      </div>
      {title && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <h1 className="text-[16px] font-medium text-ink">{title}</h1>
        </div>
      )}
      <button
        type="button"
        onClick={() => window.history.back()}
        aria-label="Back"
        className="flex h-[50px] w-10 items-center justify-center rounded-[4px]"
      >
        <BackArrowIcon className={cn("h-[21px] w-[21px] text-ink", !ar && "-scale-x-100")} />
      </button>
    </div>
  );
}

export function CategoryHeader({
  title,
  right,
  showSearch = true,
}: {
  title?: string;
  right?: React.ReactNode;
  showSearch?: boolean;
}) {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[1000] lg:hidden">
        <MobileSubHeader title={title} showSearch={showSearch} />
      </div>
      <div
        className={cn(
          "fixed top-0 left-0 z-[1000] hidden h-[55px] w-full border-b border-[#dee2e6] bg-white lg:block lg:w-[calc(100%*5/12)]",
          ar && "lg:left-[calc(100%*7/12)]"
        )}
      >
        <div className="relative h-full w-full" dir={ar ? "rtl" : "ltr"}>
          {/* Back button */}
          <button
            type="button"
            onClick={() => window.history.back()}
            aria-label="Back"
            className={cn(
              "absolute top-[3.5px] flex h-[50px] w-10 items-center justify-center",
              ar ? "right-[10px]" : "left-[10px]"
            )}
          >
            <BackArrowIcon
              className={cn("h-[21px] w-[21px] translate-y-px text-ink", !ar && "-scale-x-100")}
            />
          </button>
          {right}
          {/* Center: title */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {title && <h1 className="text-[17px] font-semibold text-ink">{title}</h1>}
          </div>
        </div>
      </div>
    </>
  );
}

export function SubHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  const lang = useLang((s) => s.lang);
  const backLabel = lang === "ar" ? "رجوع" : "Back";
  return (
    <div className="sticky top-0 z-40 flex w-full items-center gap-2 border-b border-[#d4d5d4] bg-white px-3 py-2">
      <button
        type="button"
        onClick={() => window.history.back()}
        aria-label={backLabel}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dedede] bg-white"
      >
        <ArrowLeft size={20} className="text-[#333] rtl:rotate-180" />
      </button>
      <h1 className="flex-1 truncate text-center text-[16px] font-bold text-ink">{title}</h1>
      <div className="flex items-center gap-2">
        {right}
        <CartButton />
        <LangToggle />
      </div>
    </div>
  );
}
