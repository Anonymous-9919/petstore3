"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, useDelivery, useLang, useHasMounted, deliveryAddressComplete } from "@/lib/state";
import { cn, fmtPrice } from "@/lib/utils";

// Inline translation to avoid module loading issues
const messages: Record<string, { en: string; ar: string }> = {
  goToCheckout: { en: "Go to checkout", ar: "الذهاب الى الدفع" },
  reviewOrder: { en: "Review Order", ar: "مراجعة الطلب" },
};

function getMsg(key: string): { en: string; ar: string } {
  const msg = (messages as Record<string, { en: string; ar: string }>)[key];
  if (!msg) return { en: key, ar: key };
  return msg;
}

export default function ReviewOrderBar({
  href = "/cart",
  totalOverride,
}: {
  href?: string;
  totalOverride?: number;
}) {
  const router = useRouter();
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const mounted = useHasMounted();
  const count = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const cartTotal = useCart((s) => s.items.reduce((n, i) => n + i.price * i.qty, 0));
  const mode = useDelivery((s) => s.mode);
  const branchId = useDelivery((s) => s.branchId);
  const areaId = useDelivery((s) => s.areaId);
  const name = useDelivery((s) => s.name);
  const phone = useDelivery((s) => s.phone);
  const block = useDelivery((s) => s.block);
  const street = useDelivery((s) => s.street);
  const building = useDelivery((s) => s.building);

  if (!mounted || count <= 0) return null;

  const total = totalOverride ?? cartTotal;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (href === "/checkout") {
      e.preventDefault();
      // Smart navigation: name/phone first, then location, then delivery address, then confirmation
      if (!name.trim() || !phone.trim()) {
        router.push("/checkout/details");
      } else if (
        (mode === "delivery" && !areaId) ||
        (mode === "pickup" && !branchId)
      ) {
        router.push("/select/branch");
      } else if (
        mode === "delivery" &&
        !deliveryAddressComplete({ block, street, building })
      ) {
        router.push("/checkout/address");
      } else {
        router.push("/checkout/confirmation");
      }
    } else {
      router.push(href);
    }
  };

  const label =
    href === "/checkout"
      ? getMsg("goToCheckout")[ar ? "ar" : "en"]
      : getMsg("reviewOrder")[ar ? "ar" : "en"];

  return (
    <div
      className={cn(
        "fixed bottom-0 z-40 flex h-[60px] w-full items-center bg-white pb-[8px]",
        ar ? "right-0 md:w-[41.7%]" : "left-0 md:w-[41.6%]"
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        dir={ar ? "rtl" : "ltr"}
        className="relative mx-auto mb-[4px] flex h-full w-[97%] items-center justify-center rounded-[4px] bg-brand font-medium text-black/[0.87] hover:bg-[#b24700] transition-colors"
      >
        <span
          className={cn(
            "absolute top-[6px] h-[32px] min-w-[32px] rounded-[7px] bg-black/30 px-[4px] text-center text-[16px] leading-[34px]",
            ar ? "right-[10px]" : "left-[10px]"
          )}
        >
          {count}
        </span>
        <span className="whitespace-nowrap text-[16px] font-medium">{label}</span>
        <span
          className={cn(
            "absolute top-[6px] h-[32px] min-w-[32px] rounded-[7px] px-[4px] text-center text-[16px] leading-[34px]",
            ar ? "left-[10px]" : "right-[10px]"
          )}
        >
          {fmtPrice(total, lang)}
        </span>
      </button>
    </div>
  );
}
