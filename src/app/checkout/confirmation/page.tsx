"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckoutActionBar,
  CheckoutHeader,
  ChevronForwardIcon,
  DeliveryTimeIcon,
  EditIcon,
  OfficeIcon,
  PersonIcon,
} from "@/components/Checkout";
import { LocationOnIcon } from "@/components/MuiIcons";
import { getBranches, getBranchAreas } from "@/data/loader";
import { getMsg } from "@/lib/i18n";
import { useCart, useDelivery, useLang } from "@/lib/state";
import { cn, deliveryRange, fmtPrice, getAreaLatLng, pickupRange } from "@/lib/utils";
import DeliveryMap from "@/components/DeliveryMap";
import {
  ApplePayIcon,
  CashIcon,
  KnetIcon,
  MastercardIcon,
} from "@/components/PaymentIcons";

const paymentMethods = [
  { key: "cash", msg: "cash", Icon: CashIcon },
  { key: "knet", msg: "knet", Icon: KnetIcon },
  { key: "credit", msg: "credit", Icon: MastercardIcon },
  { key: "applepay", msg: "applePay", Icon: ApplePayIcon },
] as const;

export default function CheckoutConfirmationPage() {
  const router = useRouter();
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const t = getMsg;
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.total());

  const mode = useDelivery((s) => s.mode);
  const branchId = useDelivery((s) => s.branchId);
  const areaId = useDelivery((s) => s.areaId);
  const areaName = useDelivery((s) => s.areaName);
  const areaArName = useDelivery((s) => s.areaArName);
  const name = useDelivery((s) => s.name);
  const phone = useDelivery((s) => s.phone);
  const block = useDelivery((s) => s.block);
  const street = useDelivery((s) => s.street);
  const building = useDelivery((s) => s.building);
  const avenue = useDelivery((s) => s.avenue);
  const paci = useDelivery((s) => s.paci);
  const additional = useDelivery((s) => s.additional);
  const payment = useDelivery((s) => s.payment);
  const setPayment = useDelivery((s) => s.setPayment);

  const fee = useMemo(() => {
    if (mode !== "delivery" || branchId == null || areaId == null) return 0;
    const a = getBranchAreas(branchId).find((x) => x.id === areaId);
    return a ? a.price : 0;
  }, [mode, branchId, areaId]);

  const range = mode === "pickup" ? pickupRange(lang) : deliveryRange(lang);
  const grand = total + fee;
  const branch = getBranches().find((b) => b.id === branchId);
  const areaLabel = ar && areaArName ? areaArName : areaName;
  const branchLabel = ar && branch?.ar_name ? branch.ar_name : branch?.name;

  if (items.length === 0) {
    return (
      <>
        <CheckoutHeader />
        <div className="px-4 pb-20 pt-[68px] text-center text-[15px] text-[#666]">
          {t("emptyCart")[ar ? "ar" : "en"]}
        </div>
      </>
    );
  }

  const placeOrder = () => {
    if (!payment) return;
    const orderNo = Math.floor(100000 + Math.random() * 900000);
    const q = `?order=${orderNo}`;
    if (payment === "cash") router.push(`/checkout/success${q}`);
    else router.push(`/checkout/payment${q}`);
  };

  const sep = ar ? "، " : ", ";
  const addrLine1 = [
    areaLabel,
    block && `${ar ? "قطعة" : "Block"} ${block}`,
    street && `${ar ? "شارع" : "Street"} ${street}`,
  ]
    .filter(Boolean)
    .join(sep);
  const addrLine2 = [
    building && `${ar ? "مبنى" : "Building"} ${building}`,
    avenue && `${ar ? "جادة" : "Avenue"} ${avenue}`,
    paci && `${ar ? "الرقم المدني" : "Civil number"} ${paci}`,
    additional,
  ]
    .filter(Boolean)
    .join(sep);

  const todayLabel = ar ? "اليوم" : "Today";

  const rowIcon = "flex h-[21px] w-[21px] shrink-0 text-[#5b5b5b]";

  return (
    <>
      <CheckoutHeader />
      <div className="w-full">
        <div className="h-[60px]" />

        <section className="mt-[30px]">
          <p className="box-title">{t("deliveryTime")[ar ? "ar" : "en"]}</p>
          <div className="mt-[5px] flex h-[60px] items-center justify-between border-t border-b border-[#dee2e6] bg-white">
            <div className="flex items-center ps-[15px]">
              <DeliveryTimeIcon className="shrink-0" />
              <span className="ms-[15px] text-[14px] font-bold text-[rgba(0,0,0,0.87)]">
                {todayLabel} - {range.from} {ar ? "إلى" : "to"} {range.to}
              </span>
            </div>
            <div className="pe-[15px] text-start">
              <ChevronForwardIcon className="h-[21px] w-[21px] rotate-180 text-[#5b5b5b]" />
            </div>
          </div>
        </section>

        <section className="mt-[30px]">
          <p className="box-title">{t("deliverTo")[ar ? "ar" : "en"]}</p>
          <div className="bordered mx-0 mt-[5px]">
            <div className="relative h-[138px] w-full bg-[#dbe3ec]">
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

          <Link href="/checkout/address" className="block text-black">
            <div
              dir={ar ? "rtl" : "ltr"}
              className="flex items-center justify-between border-t border-[#dee2e6] bg-white py-[20px]"
            >
              <span className="flex w-[8.33%] shrink-0 justify-center">
                <OfficeIcon className={rowIcon} />
              </span>
              <span className="flex-1 text-[14px] font-normal">
                <span className="mb-[7px] block leading-[20px]">{addrLine1}</span>
                {addrLine2 && <span className="block leading-[20px]">{addrLine2}</span>}
              </span>
              <span className="flex w-[8.33%] shrink-0 justify-end pe-[10px]">
                <EditIcon className={rowIcon} />
              </span>
            </div>
          </Link>

          <Link href="/checkout/details" className="block text-black">
              <div
              dir={ar ? "rtl" : "ltr"}
              className="flex min-h-[22px] items-center justify-between border-b border-[#dee2e6] bg-white pb-[21px]"
            >
              <span className="flex w-[8.33%] shrink-0 justify-center">
                <PersonIcon className={rowIcon} />
              </span>
              <span className="flex-1 text-[14px] font-normal">
                {name}
                {phone && (
                  <>
                    <span className="mx-1">, </span>
                    <b className="font-bold" dir="ltr">
                      {phone}
                    </b>
                  </>
                )}
              </span>
              <span className="flex w-[8.33%] shrink-0 justify-end pe-[10px]">
                <EditIcon className={rowIcon} />
              </span>
            </div>
          </Link>
        </section>

        <section className="mt-[30px]">
          <p className="box-title">
            {t("purchases")[ar ? "ar" : "en"]} -{" "}
            <Link href="/cart" className="text-brand">
              {t("edit")[ar ? "ar" : "en"]}
            </Link>
          </p>
          <div className="mt-[5px] border-t border-b border-[#dee2e6] bg-white py-[14px]">
            {items.map((it) => {
              const [price, currency] = fmtPrice(it.price * it.qty, lang).split(" ");
              const itemName = ar && it.ar_name ? it.ar_name : it.name;
              return (
                <div
                  key={it.key}
                  className="-mx-[15px] flex text-[14px] font-bold text-[rgba(0,0,0,0.87)]"
                >
                  <span className="w-[16.67%] shrink-0 px-[15px] my-[7px] text-center text-brand leading-[20px]">
                    <span dir={ar ? "rtl" : "ltr"}>{it.qty}x</span>
                  </span>
                  <span
                    className={cn(
                      "w-[58.33%] shrink-0 px-[15px] my-[7px] pb-[7px]",
                      ar ? "text-start" : "text-start"
                    )}
                    style={{ lineHeight: "20px" }}
                  >
                    {itemName}
                  </span>
                  <span
                    className={cn(
                      "w-[8.33%] shrink-0 my-[7px] leading-[20px]",
                      ar ? "text-right" : "text-left"
                    )}
                   >
                     {price}
                   </span>
                   <span
                     className={cn(
                       "w-[8.33%] shrink-0 my-[7px] leading-[20px]",
                       ar ? "text-left" : "text-right"
                      )}
                    >
                    {currency}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-[30px]">
          <p className="box-title">{t("paymentMethod")[ar ? "ar" : "en"]}</p>
          <div className="mt-[5px] mb-3 border-t border-b border-[#dee2e6] bg-white">
            <ul className="m-0 list-none py-[8px]">
              {paymentMethods.map((p) => {
                const active = payment === p.key;
                return (
                  <li key={p.key} className="flex h-[51px] items-center px-[16px]">
                    <button type="button" onClick={() => setPayment(p.key)} className="flex items-center">
                      <span
                        className={cn(
                          "flex h-[21px] w-[21px] items-center justify-center rounded-full border-2",
                          active ? "border-brand" : "border-[#808080]"
                        )}
                      >
                        {active && <span className="h-3 w-3 rounded-full bg-brand" />}
                      </span>
                      <span className="ms-[9px] flex h-6 items-center">
                        <p.Icon className="h-6 w-auto" />
                      </span>
                      <span className="ms-[9px] text-[14px] leading-[28px] text-[rgba(0,0,0,0.87)]">
                        {t(p.msg)[ar ? "ar" : "en"]}
                      </span>
                    </button>
                    <div className="flex-1" />
                    <span className="flex shrink-0 items-center pl-2">
                      <ChevronForwardIcon className="h-[30px] w-[30px] rotate-180 text-[rgba(0,0,0,0.87)]" />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          {!payment && (
            <p className="mx-auto text-center text-[12px] text-red-500">
              {ar ? "الرجاء اختيار طريقة الدفع" : "Please choose a payment method"}
            </p>
          )}
        </section>

        <div className="my-5" />

        <div
          dir={ar ? "rtl" : "ltr"}
          className={cn(
            "fixed bottom-[55px] z-[1000] w-full border-t border-[#dee2e6] bg-white py-[7px] md:w-[41.6%]",
            ar ? "right-0" : "left-0"
          )}
        >
          {[
            { label: t("subtotal")[ar ? "ar" : "en"], value: fmtPrice(total, lang) },
            { label: t("deliveryFees")[ar ? "ar" : "en"], value: mode === "delivery" ? fmtPrice(fee, lang) : "-" },
            { label: t("total")[ar ? "ar" : "en"], value: fmtPrice(grand, lang) },
          ].map((row, i) => (
              <div key={i} className={cn("flex h-[23px] items-center justify-between px-[15px]", i < 2 && "mb-[3.5px]")}>
              <span className="text-[14px] text-[rgba(0,0,0,0.87)]">{row.label}</span>
              <span className="text-[14px] text-[rgba(0,0,0,0.87)]">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="h-[190px]" />

        <CheckoutActionBar label={t("placeOrder")[ar ? "ar" : "en"]} onClick={placeOrder} />
      </div>
    </>
  );
}
