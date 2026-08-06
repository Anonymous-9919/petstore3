"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { getMsg } from "@/lib/i18n";
import { useCart, useDelivery, useHasMounted, useLang } from "@/lib/state";

export default function AreaBottomBar() {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const mounted = useHasMounted();
  const mode = useDelivery((s) => s.mode);
  const areaId = useDelivery((s) => s.areaId);
  const areaName = useDelivery((s) => s.areaName);
  const areaArName = useDelivery((s) => s.areaArName);
  const branchId = useDelivery((s) => s.branchId);
  const branchName = useDelivery((s) => s.branchName);
  const branchArName = useDelivery((s) => s.branchArName);
  const cartCount = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));

  const locationSet =
    (mode === "delivery" && !!areaId) || (mode === "pickup" && !!branchId);
  if (!mounted) return null;
  if (locationSet || cartCount > 0) return null;

  const area = ar ? areaArName || areaName : areaName;
  const branch = ar ? branchArName || branchName : branchName;

  let label: string;
  if (mode === "pickup") {
    if (branch) {
      label = ar ? `استلام من ${branch}` : `Pick up from ${branch}`;
    } else {
      label = ar ? "استلام من" : "Pick up from";
    }
  } else {
    if (area) {
      label = ar ? `توصيل الى ${area}` : `Deliver to ${area}`;
    } else {
      label = getMsg("chooseArea")[ar ? "ar" : "en"];
    }
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 z-40 flex h-[60px] w-full items-center bg-white p-[7px] pb-[8px]",
        ar ? "right-0 md:w-[41.7%]" : "left-0 md:w-[41.6%]"
      )}
    >
      <Link
        href="/select/branch"
        dir={ar ? "rtl" : "ltr"}
        className="mx-auto mb-[3.5px] flex h-[45px] w-[97%] items-center justify-center rounded-[4px] bg-brand text-[12.25px] font-medium leading-[21.4375px] text-black/[0.87]"
      >
        {label}
      </Link>
    </div>
  );
}
