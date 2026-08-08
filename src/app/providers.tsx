"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/state";
import DesktopPanel from "@/components/DesktopPanel";
import ReviewOrderBar from "@/components/ReviewOrderBar";
import { cn } from "@/lib/utils";

export default function Providers({ children }: { children: React.ReactNode }) {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const pathname = usePathname();

  const showReviewOrder =
    pathname !== "/cart" &&
    !pathname.startsWith("/checkout") &&
    !pathname.startsWith("/select/") &&
    !pathname.startsWith("/product/");

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    root.setAttribute("lang", lang);
  }, [lang]);

  return (
    <div dir="ltr" className="relative min-h-screen bg-page">
      <DesktopPanel />
      <div
        dir={ar ? "rtl" : "ltr"}
        className={cn(
          "relative z-10 min-h-screen bg-page w-full lg:w-[calc(100%*5/12)]",
          ar
            ? "lg:ml-[calc(100%*7/12)] lg:mr-0"
            : "lg:ml-0 lg:mr-[calc(100%*7/12)]"
        )}
      >
        {children}
        {showReviewOrder && <ReviewOrderBar />}
      </div>
    </div>
  );
}
