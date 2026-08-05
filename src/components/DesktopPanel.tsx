"use client";

import Link from "next/link";
import { LangToggle } from "@/components/Header";
import { HistoryIcon, PackageBagIcon, SearchIcon } from "@/components/MuiIcons";
import { useLang } from "@/lib/state";
import { cn } from "@/lib/utils";

const MUI_SHADOW =
  "shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_0_rgba(0,0,0,0.14),0_1px_5px_0_rgba(0,0,0,0.12)]";

function PanelButton({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <Link
      href={href}
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-white ${MUI_SHADOW}`}
    >
      {children}
    </Link>
  );
}

export default function DesktopPanel() {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";

  return (
    <>
      <div
        className={cn(
          "fixed inset-y-0 z-0 hidden w-[calc(100%*7/12)] lg:block",
          ar ? "left-0" : "right-0"
        )}
        style={{ background: "url(/assets/desktop-cover.jpg) 50% 50% / cover no-repeat" }}
      >
        <div
          className={cn(
            "absolute top-[13px] flex items-center gap-[32px]",
            ar ? "right-12" : "left-12"
          )}
        >
          {ar ? (
            <>
              <LangToggle className={`border-0 ${MUI_SHADOW}`} />
              <PanelButton href="/search">
                <SearchIcon className="h-[21px] w-[21px] text-black" />
              </PanelButton>
              <PanelButton href="/profile/orders">
                <HistoryIcon className="h-[21px] w-[21px] text-black/[0.87]" />
              </PanelButton>
              <PanelButton href="/cart">
                <PackageBagIcon className="h-[20px] w-[20px] text-black/[0.87]" />
              </PanelButton>
            </>
          ) : (
            <>
              <PanelButton href="/search">
                <SearchIcon className="h-[21px] w-[21px] text-black" />
              </PanelButton>
              <PanelButton href="/profile/orders">
                <HistoryIcon className="h-[21px] w-[21px] text-black/[0.87]" />
              </PanelButton>
              <PanelButton href="/cart">
                <PackageBagIcon className="h-[20px] w-[20px] text-black/[0.87]" />
              </PanelButton>
              <LangToggle className={`border-0 ${MUI_SHADOW}`} />
            </>
          )}
        </div>
      </div>
      <Link
        href="https://wa.me/96598805010"
        target="_blank"
        rel="noreferrer"
        aria-label="Live chat"
        className={cn(
          "fixed top-[430px] z-10 hidden h-[60px] w-10 bg-[#29AC00] lg:block",
          ar ? "left-0" : "right-0"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/floating-chat.png" alt="" className="h-[60px] w-10" />
      </Link>
    </>
  );
}
