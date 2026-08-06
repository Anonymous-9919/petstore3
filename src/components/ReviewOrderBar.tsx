"use client";

import Link from "next/link";
import { getMsg } from "@/lib/i18n";
import { useCart, useHasMounted, useLang } from "@/lib/state";
import { cn, fmtPrice } from "@/lib/utils";

export default function ReviewOrderBar({
  href = "/cart",
  totalOverride,
}: {
  href?: string;
  totalOverride?: number;
}) {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const mounted = useHasMounted();
  const count = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const cartTotal = useCart((s) => s.items.reduce((n, i) => n + i.price * i.qty, 0));

  if (!mounted || count <= 0) return null;

  const total = totalOverride ?? cartTotal;
  const label =
    href === "/checkout"
      ? getMsg("goToCheckout")[ar ? "ar" : "en"]
      : getMsg("reviewOrder")[ar ? "ar" : "en"];

  return (
    <div
      className={cn(
        "fixed bottom-0 z-40 flex h-[60px] w-full items-center bg-white p-[7px] pb-[8px]",
        ar ? "right-0 md:w-[41.7%]" : "left-0 md:w-[41.6%]"
      )}
    >
      <Link
        href={href}
        dir={ar ? "rtl" : "ltr"}
        className="relative mx-auto mb-[3.5px] flex h-[45px] w-[97%] items-center justify-between rounded-[4px] bg-brand px-[10px] text-[12.25px] font-medium leading-[21.4375px] text-black/[0.87]"
      >
        <span className="flex h-[32px] min-w-[32px] items-center justify-center rounded-[7px] bg-black/30 px-[3.5px] text-[14px] font-medium leading-[32px]">
          {count}
        </span>
        <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[14px] font-medium">
          {label}
        </span>
        <span className="text-[14px] font-medium">{fmtPrice(total, lang)}</span>
      </Link>
    </div>
  );
}
