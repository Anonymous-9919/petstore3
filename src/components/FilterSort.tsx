"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowBackIcon,
  FilterListIcon,
  KeyboardArrowDownIcon,
  RadioButtonCheckedIcon,
  SortIcon,
} from "@/components/MuiIcons";
import { PriceRangeSlider } from "@/components/PriceRangeSlider";
import { categoryList } from "@/data/loader";
import { getMsg, type Msg } from "@/lib/i18n";
import { useLang } from "@/lib/state";
import { cn } from "@/lib/utils";

export type SortGroup = "price" | "name" | "date";
export type SortDir = "asc" | "desc";

export interface SortSelection {
  group: SortGroup;
  dir: SortDir;
}

export interface FsState {
  sort: SortSelection | null;
  catFilter: number[];
  priceRange: [number, number] | null;
  availableOnly: boolean;
}

export const PRICE_MIN = 0.25;
export const PRICE_MAX = 35;

export function resetFsState(): FsState {
  return { sort: null, catFilter: [], priceRange: null, availableOnly: false };
}

export function hasSelection(s: FsState): boolean {
  return !!s.sort || s.catFilter.length > 0 || s.priceRange !== null || s.availableOnly;
}

export function FilterSortBar({ onOpen }: { onOpen: () => void }) {
  const lang = useLang((s) => s.lang);
  const t = getMsg;
  const ar = lang === "ar";
  return (
    <div className="hide-scrollbar mb-[19px] flex items-center justify-between px-[11px]">
      <button
        type="button"
        onClick={onOpen}
        className="flex h-[35px] items-center rounded-[3px] border border-[#dedede] bg-white px-[8px] text-[12px] font-bold text-[#333]"
      >
        {t("filterSort")[ar ? "ar" : "en"]}
      </button>
      <div className="flex cursor-pointer items-center text-[#333]">
        <SortIcon className="mr-[3px] h-[20px] w-[20px]" />
        <FilterListIcon className="h-[20px] w-[20px]" />
      </div>
    </div>
  );
}

const sortOptions: { group: SortGroup; dir: SortDir; label: Parameters<typeof getMsg>[0] }[] = [
  { group: "price", dir: "asc", label: "lowToHigh" },
  { group: "price", dir: "desc", label: "highToLow" },
  { group: "name", dir: "asc", label: "aToZ" },
  { group: "name", dir: "desc", label: "zToA" },
  { group: "date", dir: "desc", label: "sortNewest" },
  { group: "date", dir: "asc", label: "oldest" },
];

function groupLabel(g: SortGroup): Msg {
  if (g === "price") return getMsg("priceGroup");
  if (g === "name") return getMsg("nameGroup");
  return getMsg("dateGroup");
}

export function FilterSortDrawer({
  open,
  state,
  onChange,
  onClose,
  onApply,
}: {
  open: boolean;
  state: FsState;
  onChange: (s: FsState) => void;
  onClose: () => void;
  onApply: () => void;
}) {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const t = getMsg;
  const ar = lang === "ar";
  const [catOpen, setCatOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [priceDraft, setPriceDraft] = useState<[number, number]>(
    state.priceRange ?? [PRICE_MIN, PRICE_MAX]
  );

  if (!open) return null;

  const draftActive = priceDraft[0] > PRICE_MIN || priceDraft[1] < PRICE_MAX;
  const set = (patch: Partial<FsState>) => onChange({ ...state, ...patch });

  const filterItem = (
    active: boolean,
    label: Msg,
    onClick: () => void,
    icon?: ReactNode
  ) => (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      dir="ltr"
      className="mt-[15px] flex cursor-pointer items-center py-[8px]"
    >
      <span className={cn("h-[26px] w-[6px]", active ? "bg-[#ff6600]" : "bg-transparent")} />
      <span className="ml-[16px] flex-1 text-left text-[15px] font-bold text-[rgba(0,0,0,0.87)]">
        {label[ar ? "ar" : "en"]}
      </span>
      {icon}
    </div>
  );

  const expandable = (active: boolean, label: Msg, isOpen: boolean, onToggle: () => void) => (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      dir="ltr"
      className="mt-[15px] flex cursor-pointer items-center py-[8px]"
    >
      <span className={cn("h-[26px] w-[6px]", active ? "bg-[#ff6600]" : "bg-transparent")} />
      <span className="ml-[16px] flex-1 text-left text-[15px] font-bold text-[rgba(0,0,0,0.87)]">
        {label[ar ? "ar" : "en"]}
      </span>
      <KeyboardArrowDownIcon className={cn("h-6 w-6 transition-transform", isOpen && "rotate-180")} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={cn(
          "absolute inset-y-0 flex w-full flex-col bg-[#f4f5f5] lg:w-[calc(100%*5/12)]",
          ar ? "right-0" : "left-0"
        )}
      >
        <div className="detail_header absolute inset-x-0 top-0 z-[1000] h-[55px] border-b border-[#dedede] bg-white">
          <button
            type="button"
            aria-label="close"
            onClick={onClose}
            className={cn(
              "z-[22] h-[50px] w-[40px] items-center justify-center text-[rgba(0,0,0,0.87)]",
              ar ? "float-right mr-[10px]" : "float-left ml-[10px]"
            )}
          >
            <ArrowBackIcon className="h-6 w-6" />
          </button>
          <div
            className={cn(
              "absolute top-0 flex h-[55px] w-full",
              ar ? "right-[15px]" : "left-[15px]"
            )}
          >
            <p
              className="mx-auto max-h-[54px] max-w-[187px] overflow-hidden truncate whitespace-nowrap text-center text-[17px] font-semibold text-[rgba(0,0,0,0.87)]"
              style={{ lineHeight: 3 }}
            >
              {t("filterSort")[ar ? "ar" : "en"]}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLang(ar ? "en" : "ar")}
            className={cn(
              "z-[22] h-[50px] w-[40px] items-center justify-center pb-[15px] text-[20px] font-medium text-black lg:hidden",
              ar ? "float-left ml-[10px]" : "float-right mr-[10px]"
            )}
          >
            {ar ? "En" : "ع"}
          </button>
        </div>

        <div className="absolute inset-x-0 top-0 bottom-[100px] overflow-y-auto pt-[50px]">
          <nav className="pt-[8px]">
          <div className="flex items-center justify-between px-[12px] pt-[42px]">
            <span className="text-[15px] font-bold text-[rgba(0,0,0,0.87)]">{t("sortTitle")[ar ? "ar" : "en"]}</span>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => set({ sort: null })}
                className="mr-[18px] font-bold text-[#ff6600]"
              >
                {t("clearLink")[ar ? "ar" : "en"]}
              </button>
              <SortIcon className="h-[21px] w-[21px] text-[rgba(0,0,0,0.87)]" />
            </div>
          </div>
          <div className="border-2 border-[#dedede] bg-white pb-[12px]">
            <div>
              {sortOptions.map((o, i) => {
                const active =
                  state.sort !== null && state.sort.group === o.group && state.sort.dir === o.dir;
                return (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    onClick={() => set({ sort: { group: o.group, dir: o.dir } })}
                    dir="ltr"
                    className="mt-[13px] grid cursor-pointer grid-cols-2 gap-[10px]"
                  >
                    <div className="flex items-center">
                      <span
                        className={cn("h-[26px] w-[6px]", active ? "bg-[#ff6600]" : "bg-transparent")}
                      />
                      <span className="ml-[16px] font-bold text-[rgba(0,0,0,0.87)]">
                        {groupLabel(o.group)[ar ? "ar" : "en"]}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="flex-[0.8_1_0%] text-[rgba(0,0,0,0.87)]">
                        {t(o.label)[ar ? "ar" : "en"]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between px-[12px] pt-[42px]">
            <span className="text-[15px] font-bold text-[rgba(0,0,0,0.87)]">{t("filtersTitle")[ar ? "ar" : "en"]}</span>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => set({ catFilter: [], priceRange: null, availableOnly: false })}
                className="mr-[18px] font-bold text-[#ff6600]"
              >
                {t("clearLink")[ar ? "ar" : "en"]}
              </button>
              <FilterListIcon className="h-[21px] w-[21px] text-[rgba(0,0,0,0.87)]" />
            </div>
          </div>
          <div className="border-2 border-[#dedede] bg-white pb-[12px]">
            {expandable(
              state.catFilter.length > 0,
              getMsg("categoriesFs"),
              catOpen,
              () => setCatOpen(!catOpen)
            )}
            {catOpen && (
              <div>
                {categoryList.map((c) => {
                  const sel = state.catFilter.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      dir="ltr"
                      onClick={() =>
                        set({
                          catFilter: sel
                            ? state.catFilter.filter((x) => x !== c.id)
                            : [...state.catFilter, c.id],
                        })
                      }
                      className="flex cursor-pointer items-center text-left"
                    >
                      <span
                        className={cn("h-[26px] w-[6px]", sel ? "bg-[#ff6600]" : "bg-transparent")}
                      />
                      <div className="ms-[20px] text-[15px] text-[rgba(0,0,0,0.87)]">
                        {ar && c.ar_name ? c.ar_name : c.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {expandable(
              state.priceRange !== null,
              getMsg("priceGroup"),
              priceOpen,
              () => setPriceOpen(!priceOpen)
            )}
            {priceOpen && (
              <div>
                <div className="px-[16px] py-[8px]">
                  <PriceRangeSlider
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    value={priceDraft}
                    onChange={setPriceDraft}
                  />
                </div>
                <div className="flex justify-end px-[16px] py-[8px]">
                  <button
                    type="button"
                    disabled={!draftActive}
                    onClick={() => set({ priceRange: draftActive ? priceDraft : null })}
                    className={cn(
                      "me-[10px] rounded-[4px] px-4 py-[5px] text-[12px] text-white shadow-none",
                      draftActive ? "bg-[#ff6600]" : "bg-[#9c9c9c]"
                    )}
                  >
                    {t("applyRange")[ar ? "ar" : "en"]}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPriceDraft([PRICE_MIN, PRICE_MAX]);
                      set({ priceRange: null });
                    }}
                    className="rounded-[4px] border border-[#dedede] bg-white px-4 py-[5px] text-[12px] text-[#333] shadow-none"
                  >
                    {t("clearRange")[ar ? "ar" : "en"]}
                  </button>
                </div>
              </div>
            )}

            {filterItem(
              state.availableOnly,
              getMsg("availableProducts"),
              () => set({ availableOnly: !state.availableOnly }),
              state.availableOnly && (
                <RadioButtonCheckedIcon className="mr-[4px] h-[14px] w-[14px] text-[#ff6600]" />
              )
            )}
          </div>
          </nav>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-[4] flex h-[60px] items-center justify-center bg-white p-[7px]">
          <button
            type="button"
            disabled={!hasSelection(state)}
            onClick={onApply}
            className={cn(
              "h-full w-[97%] rounded-[4px] text-[12px] font-normal text-white shadow-none",
              hasSelection(state) ? "bg-[#ff6600]" : "bg-[#9c9c9c]"
            )}
          >
            {t("applyFilters")[ar ? "ar" : "en"]}
          </button>
        </div>
      </div>
    </div>
  );
}
