"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ApartmentIcon,
  CheckoutActionBar,
  CheckoutHeader,
  ChevronForwardIcon,
  HomeTypeIcon,
  OfficeIcon,
  UnderlineField,
} from "@/components/Checkout";
import {
  LocalShippingIcon,
  LocationOnIcon,
  StorefrontIcon,
} from "@/components/MuiIcons";
import { getMsg } from "@/lib/i18n";
import { useDelivery, useLang } from "@/lib/state";
import { cn, getAreaLatLng } from "@/lib/utils";
import DeliveryMap from "@/components/DeliveryMap";

const addressTypes = [
  { key: "home", msg: "homeType", Icon: HomeTypeIcon },
  { key: "apartment", msg: "apartment", Icon: ApartmentIcon },
  { key: "office", msg: "office", Icon: OfficeIcon },
] as const;

export default function CheckoutAddressPage() {
  const router = useRouter();
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const t = getMsg;

  const mode = useDelivery((s) => s.mode);
  const setMode = useDelivery((s) => s.setMode);
  const areaId = useDelivery((s) => s.areaId);
  const branchName = useDelivery((s) => s.branchName);
  const branchArName = useDelivery((s) => s.branchArName);
  const areaName = useDelivery((s) => s.areaName);
  const areaArName = useDelivery((s) => s.areaArName);
  const addressType = useDelivery((s) => s.addressType);
  const block = useDelivery((s) => s.block);
  const street = useDelivery((s) => s.street);
  const building = useDelivery((s) => s.building);
  const avenue = useDelivery((s) => s.avenue);
  const paci = useDelivery((s) => s.paci);
  const additional = useDelivery((s) => s.additional);
  const setAddress = useDelivery((s) => s.setAddress);

  const name = useDelivery((s) => s.name);
  const phone = useDelivery((s) => s.phone);
  const setContact = useDelivery((s) => s.setContact);

  const [err, setErr] = useState("");

  const areaLabel = ar && areaArName ? areaArName : areaName;
  const branchLabel = ar && branchArName ? branchArName : branchName;

  const next = () => {
    if (mode === "delivery") {
      if (!areaLabel) {
        setErr(ar ? "يرجى اختيار منطقة التوصيل" : "Please select a delivery area");
        return;
      }
      if (!block.trim() || !street.trim() || !building.trim()) {
        setErr(
          ar ? "يرجى تعبئة حقول العنوان المطلوبة" : "Please fill in the required address fields"
        );
        return;
      }
    }
    setErr("");
    // If name/phone not provided, go to details page; otherwise go to confirmation
    if (!name.trim() || !phone.trim()) {
      router.push("/checkout/details");
    } else {
      router.push("/checkout/confirmation");
    }
  };

  const setField = (
    k: "block" | "street" | "building" | "avenue" | "paci" | "additional",
    v: string
  ) => setAddress({ [k]: v } as Parameters<typeof setAddress>[0]);

  const required = (key: "block" | "street" | "building") =>
    `${t(key)[ar ? "ar" : "en"]} *`;

  return (
    <>
      <CheckoutHeader />
      <div className="mt-[55px] border-t border-[#dee2e6] bg-[#f5f5f5] pb-[80px]">
        <p className="box-title mt-[30px]">{t("method")[ar ? "ar" : "en"]}</p>
        <div className="bordered mx-0 mt-[5px] flex h-[73px] items-center justify-center">
          {(["delivery", "pickup"] as const).map((m) => {
            const active = mode === m;
            const Icon = m === "delivery" ? LocalShippingIcon : StorefrontIcon;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "mx-[15px] flex h-[42px] w-[144px] items-center justify-center gap-[15px] rounded-[3px] text-[14px] font-bold",
                  active
                    ? "border border-white bg-brand text-white"
                    : "border border-brand bg-white text-brand"
                )}
              >
                <Icon
                  className="h-6 w-6"
                  style={{ color: active ? "#fff" : "#ff6600" }}
                />
                <span className="leading-[18px]">{t(m)[ar ? "ar" : "en"]}</span>
              </button>
            );
          })}
        </div>

        {mode === "delivery" ? (
          <>
            <p className="box-title mt-[30px]">{t("deliveryAreaAddress")[ar ? "ar" : "en"]}</p>
            <div className="bordered mx-0 mt-[5px] px-[17px] pt-[22px] pb-[22px]">
              <div className="mb-[15px] grid grid-cols-[50px_auto_100px] items-center">
                <span className="text-start">
                  <LocationOnIcon className="h-[23px] w-[23px] text-brand" />
                </span>
                <Link
                  href="/select/branch"
                  className="text-start text-[14px] font-bold leading-[20px] text-brand"
                >
                  {areaLabel ?? (
                    <span className="font-normal text-[#999]">
                      {ar ? "لم يتم اختيار منطقة" : "No area selected"}
                    </span>
                  )}
                </Link>
                <Link
                  href="/select/branch"
                  className="flex items-center justify-end font-bold text-[#5b5b5b]"
                >
                  <span className="text-[14px]">{t("change")[ar ? "ar" : "en"]}</span>
                  <ChevronForwardIcon className="h-[21px] w-[21px] rotate-180 text-[#5b5b5b]" />
                </Link>
              </div>
              <p className="mb-1 text-start text-[12.6px] leading-[18px] font-bold text-[#5b5b5b]">
                {t("helpReach")[ar ? "ar" : "en"]}
              </p>
              <div className="relative h-[90px] w-full bg-[#dbe3ec]">
                {(() => {
                  const coords = getAreaLatLng(areaId);
                  return coords ? (
                    <DeliveryMap
                      lat={coords.lat}
                      lng={coords.lng}
                      className="absolute inset-0 h-full w-full"
                    />
                  ) : (
                    <LocationOnIcon className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[#8f9dad]" />
                  );
                })()}
                <Link
                  href="/select/branch"
                  className="absolute top-0 bottom-0 left-[15px] z-[401] my-auto flex h-[35px] w-[75px] items-center justify-center border border-brand/50 bg-white pr-[15px] text-[12.25px] font-medium text-brand shadow-[1px_1px_1px_1px_rgb(184,184,184)]"
                >
                  <span className="ml-[6px]">{t("edit")[ar ? "ar" : "en"]}</span>
                  <ChevronForwardIcon className="h-[20px] w-[20px] rotate-180" />
                </Link>
              </div>
            </div>

            <p className="box-title mt-[30px]">{t("addressDetails")[ar ? "ar" : "en"]}</p>
            <div className="bordered mx-0 mt-[5px] px-[17px] pt-[25px] pb-[25px]">
              <div className="flex justify-evenly">
                {addressTypes.map((a) => {
                  const active = addressType === a.key;
                  return (
                    <div key={a.key} className="mx-[5px] h-[42px] w-[144px]">
                      <button
                        type="button"
                        onClick={() => setAddress({ addressType: a.key })}
                        className={cn(
                          "flex h-full w-full items-center justify-center rounded-[3px] px-[10px] font-bold",
                          active
                            ? "bg-brand text-black/[0.87]"
                            : "border border-[#cecece] bg-white text-[#666]"
                        )}
                      >
                        <a.Icon className="h-[21px] w-[21px]" />
                        <span className="mt-[2px] ms-[10px] text-[11.5px]">
                          {t(a.msg)[ar ? "ar" : "en"]}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-[12px] text-start pb-[10px]">
                <UnderlineField
                  label={required("block")}
                  value={block}
                  onChange={(v) => setField("block", v)}
                />
                <div className="mt-[20px]">
                  <UnderlineField
                    label={required("street")}
                    value={street}
                    onChange={(v) => setField("street", v)}
                  />
                </div>
                <div className="mt-[20px]">
                  <UnderlineField
                    label={required("building")}
                    value={building}
                    onChange={(v) => setField("building", v)}
                  />
                </div>
                <div className="mt-[20px]">
                  <UnderlineField
                    label={t("avenue")[ar ? "ar" : "en"]}
                    value={avenue}
                    onChange={(v) => setField("avenue", v)}
                  />
                </div>
                <div className="mt-[20px]">
                  <UnderlineField
                    label={t("paci")[ar ? "ar" : "en"]}
                    value={paci}
                    onChange={(v) => setField("paci", v)}
                  />
                </div>
                <div className="mt-[20px]">
                  <UnderlineField
                    label={t("additional")[ar ? "ar" : "en"]}
                    value={additional}
                    onChange={(v) => setField("additional", v)}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="box-title mt-[30px]">{t("ourBranches")[ar ? "ar" : "en"]}</p>
            <div className="bordered mx-0 mt-[5px]">
              <div className="flex min-h-[50px] items-center justify-between px-[10px] py-[13px]">
                <div className="text-[14px] font-bold leading-[20px] text-[#5b5b5b]">
                  {branchLabel ?? (
                    <span className="font-normal text-[#999]">
                      {ar ? "لم يتم اختيار فرع" : "No branch selected"}
                    </span>
                  )}
                </div>
                <Link
                  href="/select/branch"
                  className="flex items-center font-bold text-[#5b5b5b]"
                >
                  <span className="text-[0.9rem]">{t("change")[ar ? "ar" : "en"]}</span>
                  <ChevronForwardIcon className="h-6 w-6 rotate-180 text-[#5b5b5b]" />
                </Link>
              </div>
            </div>
          </>
        )}

        {err && <p className="mt-3 px-4 text-start text-[12px] text-red-500">{err}</p>}
      </div>
      <CheckoutActionBar label={t("next")[ar ? "ar" : "en"]} onClick={next} />
    </>
  );
}
