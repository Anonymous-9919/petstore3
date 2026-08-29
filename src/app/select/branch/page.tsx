"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { CategoryHeader } from "@/components/Header";
import { KeyboardArrowDownIcon, LocalShippingIcon, StorefrontIcon } from "@/components/MuiIcons";
import { useDelivery, useLang } from "@/lib/state";
import { cn } from "@/lib/utils";

type RawArea = {
  id: number;
  area: string;
  area_ar: string;
  area_id: number;
  province_en: string;
  price: number;
  branch: number;
};

type RawBranch = { id: number; name: string; ar_name: string };
type RawProvince = { name: string; ar_name: string };

export default function SelectBranchPage() {
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const router = useRouter();
  const [provinces, setProvinces] = useState<RawProvince[]>([]);
  const [branches, setBranches] = useState<RawBranch[]>([]);
  const [charges, setCharges] = useState<RawArea[]>([]);

  const mode = useDelivery((s) => s.mode);
  const setMode = useDelivery((s) => s.setMode);
  const setBranch = useDelivery((s) => s.setBranch);
  const setArea = useDelivery((s) => s.setArea);
  const setDeliveryTime = useDelivery((s) => s.setDeliveryTime);

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pickedArea, setPickedArea] = useState<RawArea | null>(null);
  const [pickedBranchId, setPickedBranchId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/storefront/fulfillment")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        setBranches(data.branches.map((branch: { id: number; name: string; nameAr: string }) => ({ id: branch.id, name: branch.name, ar_name: branch.nameAr })));
        setProvinces(data.provinces.map((province: { name: string; nameAr: string }) => ({ name: province.name, ar_name: province.nameAr })));
        setCharges(data.provinces.flatMap((province: { name: string; areas: Array<{ id: number; name: string; nameAr: string; branchId: number; fee: string }> }) => province.areas.map((area) => ({ id: area.id, area: area.name, area_ar: area.nameAr, area_id: area.id, province_en: province.name, price: Number(area.fee), branch: area.branchId }))));
      })
      .catch(() => undefined);
  }, []);

  const areasByProvince = useMemo(() => {
    const m = new Map<string, RawArea[]>();
    provinces.forEach((p) => m.set(p.name, []));
    charges.forEach((a) => {
      const key = a.province_en;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(a);
    });
    m.forEach((arr) =>
      arr.sort((x, y) => {
        const nx = ar ? x.area_ar : x.area;
        const ny = ar ? y.area_ar : y.area;
        return nx.localeCompare(ny);
      })
    );
    return m;
  }, [provinces, charges, ar]);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const provinceMatches = (pName: string, pAr: string) => {
    if (!searching) return true;
    return (
      pName.toLowerCase().includes(q) || pAr.toLowerCase().includes(q)
    );
  };

  const areaMatches = (a: RawArea) => {
    if (!searching) return true;
    return a.area.toLowerCase().includes(q) || a.area_ar.toLowerCase().includes(q);
  };

  const visibleProvinces = provinces.filter((p) => {
    if (!searching) return true;
    const areas = areasByProvince.get(p.name) || [];
    if (provinceMatches(p.name, p.ar_name)) return true;
    return areas.some(areaMatches);
  });

  const onToggleMode = (m: "delivery" | "pickup") => {
    if (mode === m) return;
    setMode(m);
    setExpanded(null);
    setPickedArea(null);
    setPickedBranchId(null);
    setQuery("");
  };

  const onToggleProvince = (pName: string) => {
    setExpanded((cur) => (cur === pName ? null : pName));
  };

  const onPickArea = (a: RawArea) => {
    setPickedArea(a);
    setPickedBranchId(null);
  };

  const onPickBranch = (id: number) => {
    setPickedBranchId(id);
    setPickedArea(null);
  };

  const canSave =
    (mode === "delivery" && !!pickedArea) ||
    (mode === "pickup" && pickedBranchId != null);

  const onSave = async () => {
    let selectedBranchId: number | null = null;
    if (mode === "delivery" && pickedArea) {
      const br = branches.find((branch) => branch.id === pickedArea.branch);
      setBranch(pickedArea.branch, br?.name, br?.ar_name);
      setArea(pickedArea.area_id, pickedArea.area, pickedArea.area_ar);
      selectedBranchId = pickedArea.branch;
    } else if (mode === "pickup" && pickedBranchId != null) {
      const br = branches.find((b) => b.id === pickedBranchId);
      setBranch(pickedBranchId, br?.name, br?.ar_name);
      setArea(0, "", "");
      selectedBranchId = pickedBranchId;
    }
    if (selectedBranchId) {
      const response = await fetch(`/api/storefront/fulfillment?branchId=${selectedBranchId}&mode=${mode}`);
      const data = response.ok ? await response.json() : { days: [] };
      const day = data.days.find((candidate: { active: boolean }) => candidate.active);
      const slot = day?.slots.find((candidate: { active: boolean }) => candidate.active);
      if (day && slot) setDeliveryTime({ type: "scheduled", date: day.key, start: slot.start, end: slot.end });
    }
    router.push("/");
  };

  return (
    <>
      <CategoryHeader showSearch={false} />

      <div className="pt-[86px] pb-[76px]">
        <p className="box-title">{ar ? "الطريقة" : "Method"}</p>
        <div className="bordered mx-0 mt-[5px] flex h-[73px] items-center justify-center gap-[30px]">
          <button
            type="button"
            onClick={() => onToggleMode("delivery")}
            className={cn(
              "flex h-[42px] w-[144px] items-center justify-center gap-4 rounded-[4px] text-[14px] font-bold",
              mode === "delivery"
                ? "border border-white bg-brand text-white"
                : "border border-brand bg-white text-brand"
            )}
          >
            <LocalShippingIcon
              className="h-[21px] w-[21px]"
              style={{ color: mode === "delivery" ? "#fff" : "#ff6600" }}
            />
            <span>{ar ? "توصيل" : "Delivery"}</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleMode("pickup")}
            className={cn(
              "flex h-[42px] w-[144px] items-center justify-center gap-4 rounded-[4px] text-[14px] font-bold",
              mode === "pickup"
                ? "border border-white bg-brand text-white"
                : "border border-brand bg-white text-brand"
            )}
          >
            <StorefrontIcon
              className="h-[21px] w-[21px]"
              style={{ color: mode === "pickup" ? "#fff" : "#ff6600" }}
            />
            <span>{ar ? "استلام" : "Pickup"}</span>
          </button>
        </div>

        <div className="mt-[30px]">
          <p className="box-title">{mode === "pickup" ? (ar ? "اختر المتجر" : "Choose store") : (ar ? "العنوان" : "Address")}</p>
          <div className="bordered mx-0 mt-[5px] min-h-[500px]">
            {mode === "delivery" && (
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={ar ? "ابحث ..." : "Search ..."}
                  className={cn(
                    "block h-[44px] w-full bg-transparent py-[7px] text-[14px] text-ink placeholder:text-[#5b5b5b] focus:outline-none border-0 border-b border-[#dedede]",
                    ar ? "pr-[40px] pl-[9px]" : "pl-[40px] pr-[9px]"
                  )}
                  style={{ direction: ar ? "rtl" : "ltr" }}
                />
                <Search className={cn("pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-[#5b5b5b]", ar ? "right-[10px]" : "left-[10px]")} />
              </div>
            )}

            {mode === "delivery" ? (
              <ul className="py-[8px]">
                {visibleProvinces.map((p) => {
                  const isOpen = searching
                    ? (areasByProvince.get(p.name) || []).some(areaMatches) ||
                      provinceMatches(p.name, p.ar_name)
                    : expanded === p.name;
                  const areas = isOpen ? areasByProvince.get(p.name) || [] : [];
                  const showAreas = searching
                    ? areas.filter(areaMatches)
                    : areas;
                  return (
                    <li key={p.name}>
                      <button
                        type="button"
                        onClick={() => onToggleProvince(p.name)}
                        className={cn(
                          "flex w-full items-center justify-between px-[16px] py-[8px] hover:bg-black/[0.04]",
                          ar ? "text-right" : "text-left"
                        )}
                        style={{ direction: ar ? "rtl" : "ltr" }}
                      >
                        <span className="flex-1 text-[14px] font-bold leading-[21px] text-ink">
                          {ar ? p.ar_name : p.name}
                        </span>
                        <KeyboardArrowDownIcon
                          className={cn(
                            "h-[21px] w-[21px] text-[#5b5b5b] transition-transform",
                            isOpen && "rotate-180"
                          )}
                        />
                      </button>
                      {isOpen && (
                        <ul>
                          {showAreas.map((a) => {
                            const selected =
                              pickedArea?.area_id === a.area_id;
                            return (
                              <li key={a.area_id}>
                                <button
                                  type="button"
                                  onClick={() => onPickArea(a)}
                                  className={cn(
                                    "mx-auto flex w-[97%] min-h-[45px] items-center rounded-[4px] py-[8px] text-[14px] leading-[21px]",
                                    ar ? "pr-[35px] pl-4 text-right" : "pl-[35px] pr-4 text-left",
                                    selected
                                      ? "bg-brand text-white"
                                      : "bg-transparent text-ink hover:bg-black/[0.04]"
                                  )}
                                >
                                  {ar ? a.area_ar : a.area}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ul className="py-[8px]">
                {branches
                  .filter((b) => {
                    if (!searching) return true;
                    const n = (ar ? b.ar_name : b.name).toLowerCase();
                    return n.includes(q);
                  })
                  .map((b) => {
                    const selected = pickedBranchId === b.id;
                    return (
                      <li key={b.id} className="my-[10px] mb-[16px]">
                        <button
                          type="button"
                          onClick={() => onPickBranch(b.id)}
                          className={cn(
                            "block w-full min-h-[40px] py-[4px] text-[14px] leading-[21px]",
                            ar ? "pr-4 pl-12 text-right" : "pl-4 pr-12 text-left",
                            selected
                              ? "border-s-[5px] border-s-brand bg-black/[0.04]"
                              : "border-s-[5px] border-s-transparent bg-transparent text-ink hover:bg-black/[0.04]"
                          )}
                        >
                          <div className="px-[10px] font-bold">
                            {ar ? b.ar_name : b.name}
                          </div>
                          <div className="mx-[10px] mt-2 border-t border-[#dee2e6]" />
                        </button>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {canSave && (
        <div
          dir="ltr"
          className={cn(
            "fixed bottom-0 z-[1000] flex h-[60px] w-full items-center bg-white p-[7px] pb-[8px]",
            ar ? "right-0 md:w-[41.7%]" : "left-0 md:w-[41.6%]"
          )}
        >
          <button
            type="button"
            onClick={onSave}
            dir={ar ? "rtl" : "ltr"}
            className="mx-auto mb-[3.5px] flex h-[45px] w-[97%] items-center justify-center rounded-[4px] bg-brand text-[12.25px] font-medium leading-[21.4375px] text-black/[0.87]"
          >
            {ar ? "حفظ" : "Done"}
          </button>
        </div>
      )}
    </>
  );
}
