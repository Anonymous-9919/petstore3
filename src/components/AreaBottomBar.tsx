"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { getMsg } from "@/lib/i18n";
import { useDelivery, useLang } from "@/lib/state";

export default function AreaBottomBar() {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const mode = useDelivery((s) => s.mode);
  const areaId = useDelivery((s) => s.areaId);
  const areaName = useDelivery((s) => s.areaName);
  const areaArName = useDelivery((s) => s.areaArName);
  const branchId = useDelivery((s) => s.branchId);
  const branchName = useDelivery((s) => s.branchName);
  const branchArName = useDelivery((s) => s.branchArName);

  const locationSet =
    (mode === "delivery" && !!areaId) || (mode === "pickup" && !!branchId);
  if (locationSet) return null;

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
    <div className="fixed inset-x-0 bottom-0 z-40">
      <div
        className={cn(
          "flex h-[60px] w-full flex-col items-center bg-white pt-[5px] pb-[10px] lg:w-[calc(100%*5/12)]",
          ar
            ? "lg:ml-[calc(100%*7/12)] lg:mr-0"
            : "lg:ml-0 lg:mr-[calc(100%*7/12)]"
        )}
      >
        <Link
          href="/select/branch"
          className="flex h-[45px] w-[calc(100%-31px)] items-center justify-center rounded-[4px] bg-brand text-[12.25px] font-medium text-white"
        >
          {label}
        </Link>
      </div>
    </div>
  );
}
