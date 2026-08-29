"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMsg } from "@/lib/i18n";
import { useDelivery, useLang } from "@/lib/state";
import { cn, slotText, tomorrowKey } from "@/lib/utils";
import { LocalShippingIcon, ScheduleIcon } from "@/components/MuiIcons";
import DeliveryTimeDrawer from "@/components/DeliveryTimeDrawer";

export default function DeliveryBar() {
  const lang = useLang((s) => s.lang);
  const t = getMsg;
  const ar = lang === "ar";
  const router = useRouter();
  const mode = useDelivery((s) => s.mode);
  const setMode = useDelivery((s) => s.setMode);
  const areaId = useDelivery((s) => s.areaId);
  const areaName = useDelivery((s) => s.areaName);
  const areaArName = useDelivery((s) => s.areaArName);
  const branchId = useDelivery((s) => s.branchId);
  const branchName = useDelivery((s) => s.branchName);
  const branchArName = useDelivery((s) => s.branchArName);
  const timeType = useDelivery((s) => s.timeType);
  const expectedDate = useDelivery((s) => s.expectedDate);
  const expectedStart = useDelivery((s) => s.expectedStart);
  const expectedEnd = useDelivery((s) => s.expectedEnd);
  const setDeliveryTime = useDelivery((s) => s.setDeliveryTime);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const area = ar ? areaArName || areaName : areaName;
  const branch = ar ? branchArName || branchName : branchName;
  const hasValue = mode === "delivery" ? !!areaId : !!branchId;
  useEffect(() => {
    if (!branchId || (expectedDate && expectedStart && expectedEnd)) return;
    fetch(`/api/storefront/fulfillment?branchId=${branchId}&mode=${mode}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        const day = data.days.find((candidate: { active: boolean }) => candidate.active);
        const slot = day?.slots.find((candidate: { active: boolean }) => candidate.active);
        if (day && slot) setDeliveryTime({ type: "scheduled", date: day.key, start: slot.start, end: slot.end });
      })
      .catch(() => undefined);
  }, [branchId, mode, expectedDate, expectedStart, expectedEnd, setDeliveryTime]);

  const onPickMode = (m: "delivery" | "pickup") => {
    setMode(m);
    if (m === "delivery" && !areaId) {
      router.push("/select/branch");
    } else if (m === "pickup" && !branchId) {
      router.push("/select/branch");
    }
  };

  const modeBtn = (m: "delivery" | "pickup", label: string) => {
    const selected =
      m === "delivery"
        ? mode === "delivery" && !!areaId
        : mode === "pickup" && !!branchId;
    return (
      <div className="mx-auto flex w-[33.333%] justify-center">
        <button
          type="button"
          onClick={() => onPickMode(m)}
          className={cn(
            "flex w-[80px] items-center justify-center rounded-[3px] text-[12.25px] font-bold transition-colors duration-150",
            selected
              ? "h-[37px] bg-brand text-ink hover:bg-[#b24700]"
              : "h-[39px] border border-[#666] text-[#666] hover:bg-black/[0.04]"
          )}
        >
          {label}
        </button>
      </div>
    );
  };

  const changeBtn = (
    <button
      type="button"
      onClick={() => setDrawerOpen(true)}
      className="flex h-[33px] w-10 cursor-pointer items-center justify-center text-center text-[12.25px] font-medium leading-[1.75] text-brand"
    >
      {t("change")[ar ? "ar" : "en"]}
    </button>
  );

  const deliverLabel =
    mode === "pickup"
      ? ar
        ? "استلام من"
        : "Pick up from"
      : t("deliverTo")[ar ? "ar" : "en"];
  const deliverValue =
    mode === "pickup"
      ? branch || (ar ? "اختر فرع" : "Choose branch")
      : area || t("areaPlaceholder")[ar ? "ar" : "en"];

  const row2Label = t(mode === "delivery" ? "earliestArrival" : "earliestPickup")[
    ar ? "ar" : "en"
  ];
  const scheduled = timeType === "scheduled" && !!expectedDate;
  const row2Value = !hasValue
    ? ""
    : scheduled && expectedStart && expectedEnd
      ? slotText(expectedDate as string, expectedStart, expectedEnd, lang)
      : "";
  const row2Red = scheduled && !!expectedDate && expectedDate > tomorrowKey();
  const openTime = () => hasValue && setDrawerOpen(true);

  return (
    <div className="mt-px w-full border-b border-[#d4d5d4] bg-white" dir={ar ? "rtl" : "ltr"}>
      <div className="flex h-[66px] items-center border-t border-b border-[#dee2e6]">
        {modeBtn("delivery", t("delivery")[ar ? "ar" : "en"])}
        {modeBtn("pickup", t("pickup")[ar ? "ar" : "en"])}
      </div>

      <Link
        href="/select/branch"
        className={cn(
          "grid items-center pt-3 mb-2.5",
          mode === "pickup"
            ? "grid-cols-[15%_25%_auto_16%]"
            : "grid-cols-[15%_20%_auto_16%]"
        )}
      >
        <div className="flex justify-center">
          <LocalShippingIcon className="h-[21px] w-[21px] text-[#adadad]" />
        </div>
        <div className="min-w-0 text-start text-[14px] leading-5 text-ink">
          {deliverLabel}
        </div>
        <div className="min-w-0 whitespace-nowrap text-end text-[14px] font-bold leading-5 text-ink">
          {deliverValue}
        </div>
        <div className="flex h-[33px] items-center justify-center text-[12.25px] font-medium text-brand">
          {t("change")[ar ? "ar" : "en"]}
        </div>
      </Link>

      <div
        className={cn(
          "grid grid-cols-[15%_30%_auto_16%] items-center pb-5"
        )}
      >
        <div className="flex justify-center">
          <ScheduleIcon className="h-[21px] w-[21px] text-[#adadad]" />
        </div>
        <div
          className="min-w-0 text-start text-[14px] leading-5 text-ink"
          style={{ cursor: hasValue ? "pointer" : "default" }}
          onClick={openTime}
        >
          {row2Label}
        </div>
        <div
          className={cn(
            "min-w-0 break-words text-end text-[14px] font-bold leading-5",
            row2Red ? "text-[#f00]" : "text-ink"
          )}
          style={{ cursor: hasValue ? "pointer" : "default" }}
          onClick={openTime}
        >
          {row2Value}
        </div>
        {hasValue && <span className="flex justify-center">{changeBtn}</span>}
      </div>

      <DeliveryTimeDrawer
        open={drawerOpen}
        mode={mode}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
