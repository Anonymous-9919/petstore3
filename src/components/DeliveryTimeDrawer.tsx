"use client";

import { useEffect, useState } from "react";
import { getMsg } from "@/lib/i18n";
import { useDelivery, useLang } from "@/lib/state";
import {
  cn,
  dateOptionLabel,
  slotRangeText,
} from "@/lib/utils";
import { KeyboardArrowDownIcon, ScheduleIcon } from "@/components/MuiIcons";

function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
        checked ? "border-brand" : "border-[#757575]"
      )}
    >
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          checked ? "bg-brand" : "bg-transparent"
        )}
      />
    </span>
  );
}

type SelectOption = {
  value: string;
  label: string;
  active?: boolean;
  selected?: boolean;
};

function SelectBox({
  value,
  options,
  onPick,
  ar,
}: {
  value: string;
  options: SelectOption[];
  onPick: (v: string) => void;
  ar: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative min-w-0 flex-1 text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-[32px] w-full items-center justify-between gap-1 rounded-[4px] border border-[#767676]/60 bg-white px-2 text-[14px] text-ink"
        style={{ direction: ar ? "rtl" : "ltr" }}
      >
        <span className="truncate">{value}</span>
        <KeyboardArrowDownIcon
          className={cn(
            "h-5 w-5 shrink-0 text-[#757575] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul
            className="absolute left-0 right-0 z-50 max-h-[220px] overflow-auto rounded-[4px] bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.25)]"
            style={{ direction: ar ? "rtl" : "ltr" }}
          >
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  disabled={o.active === false}
                  onClick={() => {
                    onPick(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center px-4 py-2 text-left text-[14px] text-ink hover:bg-black/[0.04]",
                    o.selected && "bg-black/[0.04] font-medium",
                    o.active === false && "opacity-50"
                  )}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function DeliveryTimeDrawer({
  open,
  mode,
  onClose,
}: {
  open: boolean;
  mode: "delivery" | "pickup";
  onClose: () => void;
}) {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const t = getMsg;
  const expectedDate = useDelivery((s) => s.expectedDate);
  const expectedStart = useDelivery((s) => s.expectedStart);
  const expectedEnd = useDelivery((s) => s.expectedEnd);
  const branchId = useDelivery((s) => s.branchId);
  const setDeliveryTime = useDelivery((s) => s.setDeliveryTime);
  const [days, setDays] = useState<Array<{ key: string; active: boolean; slots: Array<{ start: string; end: string; active: boolean }> }>>([]);
  const [dateKey, setDateKey] = useState("");
  const [slotKey, setSlotKey] = useState("");

  useEffect(() => {
    if (!open || !branchId) return;
    fetch(`/api/storefront/fulfillment?branchId=${branchId}&mode=${mode}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        const nextDays = data.days.filter((day: { active: boolean }) => day.active);
        const selectedDay = nextDays.find((day: { key: string }) => day.key === expectedDate) ?? nextDays[0];
        const selectedSlot = selectedDay?.slots.find((slot: { start: string; end: string; active: boolean }) => slot.active && slot.start === expectedStart && slot.end === expectedEnd) ?? selectedDay?.slots.find((slot: { active: boolean }) => slot.active);
        setDays(nextDays);
        setDateKey(selectedDay?.key ?? "");
        setSlotKey(selectedSlot ? `${selectedSlot.start} - ${selectedSlot.end}` : "");
        if (selectedDay && selectedSlot && (selectedDay.key !== expectedDate || selectedSlot.start !== expectedStart || selectedSlot.end !== expectedEnd)) {
          setDeliveryTime({ type: "scheduled", date: selectedDay.key, start: selectedSlot.start, end: selectedSlot.end });
        }
      })
      .catch(() => setDays([]));
  }, [open, branchId, mode, expectedDate, expectedStart, expectedEnd]);

  const day = days.find((candidate) => candidate.key === dateKey) || days[0];

  if (!open || !day) return null;

  const currentSlot =
    day.slots.find((s) => `${s.start} - ${s.end}` === slotKey) || day.slots[0];

  const onPickDate = (key: string) => {
    const nd = days.find((d) => d.key === key) || day;
    const ns = nd.slots.find((s) => s.active) || nd.slots[0];
    setDateKey(key);
    setSlotKey(`${ns.start} - ${ns.end}`);
    setDeliveryTime({ type: "scheduled", date: key, start: ns.start, end: ns.end });
  };

  const onPickTime = (key: string) => {
    setSlotKey(key);
    const [start, end] = key.split(" - ");
    setDeliveryTime({ type: "scheduled", date: dateKey, start, end });
  };

  const scheduleLabel = mode === "pickup"
    ? t("schedulePickupForLater")[ar ? "ar" : "en"]
    : t("scheduleForLater")[ar ? "ar" : "en"];

  const dateOptions = days.map((d) => ({
    value: d.key,
    label: dateOptionLabel(d.key, lang),
    active: d.active,
    selected: d.key === dateKey,
  }));

  const timeOptions = day.slots.map((s) => ({
    value: `${s.start} - ${s.end}`,
    label: slotRangeText(s.start, s.end, lang),
    active: s.active,
    selected: `${s.start} - ${s.end}` === slotKey,
  }));

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000]">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full bg-white pb-[8px] text-center shadow-[0_-6px_20px_rgba(0,0,0,0.25)] lg:w-[calc(100%*5/12)]",
          ar
            ? "lg:ml-[calc(100%*7/12)] lg:mr-0"
            : "lg:ml-0 lg:mr-[calc(100%*7/12)]"
        )}
        dir={ar ? "rtl" : "ltr"}
      >
        <h2
          className="mx-auto mt-[25px] text-[16px] text-ink"
          style={{
            width: "90%",
            fontFamily: ar ? "Cairo" : "Quicksand",
            textAlign: ar ? "right" : "left",
          }}
        >
          {t("arrivalTime")[ar ? "ar" : "en"]}
        </h2>

        <div className="mt-3">
          <div className="mx-auto flex w-[90%] items-center justify-between">
            <div className="flex min-w-0 items-center gap-3" style={{ direction: ar ? "rtl" : "ltr" }}>
              <ScheduleIcon className="h-7 w-7 shrink-0 text-[#9e9e9e]" />
              <span className="text-[20px] text-ink">{scheduleLabel}</span>
            </div>
            <Radio checked={true} />
          </div>
        </div>

        <div className="mx-auto my-5 flex w-[90%] justify-between gap-4">
          <SelectBox
            value={dateOptionLabel(dateKey, lang)}
            options={dateOptions}
            onPick={onPickDate}
            ar={ar}
          />
          <SelectBox
            value={slotRangeText(currentSlot.start, currentSlot.end, lang)}
            options={timeOptions}
            onPick={onPickTime}
            ar={ar}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mb-[8px] h-[45px] w-[97%] rounded-[4px] bg-brand text-[16px] font-bold text-white"
        >
          {t("close")[ar ? "ar" : "en"]}
        </button>
      </div>
    </div>
  );
}
