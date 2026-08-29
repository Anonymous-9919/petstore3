"use client";

import { useEffect, useMemo, useState } from "react";
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
import { getMsg } from "@/lib/i18n";
import { useCart, useDelivery, useLang } from "@/lib/state";
import { cn, fmtPrice, slotText } from "@/lib/utils";
import DeliveryMap from "@/components/DeliveryMap";
import {
  CashBagIcon,
  KnetCardIcon,
  MinusIcon,
  PlusIcon,
} from "@/components/PaymentIcons";

const paymentMethods = [
  { key: "cash", msg: "cash", Icon: CashBagIcon },
  ...(process.env.NEXT_PUBLIC_MOCK_PAYMENTS_ENABLED === "true" ? [{ key: "knet", msg: "knet", Icon: KnetCardIcon }] : []),
] as const;

export default function CheckoutConfirmationPage() {
  const router = useRouter();
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const t = getMsg;
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.total());
  const setQty = useCart((s) => s.setQty);
  const removeItem = useCart((s) => s.remove);

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
  const floor = useDelivery((s) => s.floor);
  const apartment = useDelivery((s) => s.apartment);
  const paci = useDelivery((s) => s.paci);
  const additional = useDelivery((s) => s.additional);
  const payment = useDelivery((s) => s.payment);
  const setPayment = useDelivery((s) => s.setPayment);
  const expectedDate = useDelivery((s) => s.expectedDate);
  const expectedStart = useDelivery((s) => s.expectedStart);
  const expectedEnd = useDelivery((s) => s.expectedEnd);

  const [editing, setEditing] = useState<{ key: string; qty: number } | null>(null);
  const [draftQty, setDraftQty] = useState(1);
  const [payError, setPayError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [fulfillment, setFulfillment] = useState<{ fee: number; branch?: { name: string; nameAr: string; latitude: string | null; longitude: string | null }; area?: { latitude: string | null; longitude: string | null } }>({ fee: 0 });
  const [promotionDraft, setPromotionDraft] = useState("");
  const [promotionCode, setPromotionCode] = useState("");
  const [quote, setQuote] = useState<{ subtotal: string; deliveryFee: string; discountTotal: string; total: string; promotion: { code: string | null; name: string } | null } | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/storefront/fulfillment").then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
      const branch = data.branches.find((item: { id: number }) => item.id === branchId);
      const area = data.provinces.flatMap((province: { areas: Array<{ id: number; branchId: number; fee: string; latitude: string | null; longitude: string | null }> }) => province.areas).find((item: { id: number; branchId: number }) => item.id === areaId && item.branchId === branchId);
      setFulfillment({ fee: mode === "delivery" ? Number(area?.fee ?? 0) : 0, branch, area });
    }).catch(() => setFulfillment({ fee: 0 }));
  }, [mode, branchId, areaId]);

  const canQuote = Boolean(branchId && name && phone && (mode !== "delivery" || (areaId && block && street && building)));

  useEffect(() => {
    if (!canQuote) return;
    const controller = new AbortController();
    const scheduledStartAt = expectedDate && expectedStart ? new Date(`${expectedDate}T${expectedStart}:00+03:00`).toISOString() : undefined;
    const scheduledEndAt = expectedDate && expectedEnd ? new Date(`${expectedDate}T${expectedEnd}:00+03:00`).toISOString() : undefined;
    void fetch("/api/checkout/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        items: items.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.qty, note: item.note || undefined, optionValueIds: item.options.map((option) => option.choiceId) })),
        mode, branchId, areaId, paymentMethod: payment || "cash", contact: { name, phone },
        address: mode === "delivery" ? { type: useDelivery.getState().addressType, block, street, building, avenue, floor, apartment, paci, additional } : null,
        scheduledStartAt, scheduledEndAt, promotionCode: promotionCode || undefined,
      }),
    }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update the promotion.");
      setQuote(result); setQuoteError(null);
    }).catch((error: unknown) => {
      if ((error as { name?: string }).name !== "AbortError") { setQuote(null); setQuoteError(error instanceof Error ? error.message : "Unable to update the promotion."); }
    });
    return () => controller.abort();
  }, [additional, apartment, areaId, avenue, block, branchId, building, canQuote, expectedDate, expectedEnd, expectedStart, floor, items, mode, name, paci, payment, phone, promotionCode, street]);

  const fee = quote && canQuote ? Number(quote.deliveryFee) : fulfillment.fee;
  const subtotal = quote && canQuote ? Number(quote.subtotal) : total;
  const discount = quote && canQuote ? Number(quote.discountTotal) : 0;
  const grand = quote && canQuote ? Number(quote.total) : subtotal + fee;
  const branch = fulfillment.branch;
  const areaLabel = ar && areaArName ? areaArName : areaName;
  const branchLabel = ar && branch?.nameAr ? branch.nameAr : branch?.name;

  const coords = useMemo(() => {
    if (mode === "pickup") {
      const lat = branch?.latitude ? parseFloat(branch.latitude) : NaN;
      const lng = branch?.longitude ? parseFloat(branch.longitude) : NaN;
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat > 28.5 &&
        lat < 30.5 &&
        lng > 46 &&
        lng < 49.5
      ) {
        return { lat, lng };
      }
      return null;
    }
    const lat = fulfillment.area?.latitude ? parseFloat(fulfillment.area.latitude) : NaN;
    const lng = fulfillment.area?.longitude ? parseFloat(fulfillment.area.longitude) : NaN;
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }, [mode, branch, fulfillment.area]);

  const directionsUrl =
    coords != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
      : undefined;

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

  const placeOrder = async () => {
    if (!payment || placing) return;
    setPlacing(true);
    setPayError(null);
    try {
      const scheduledStartAt = useDelivery.getState().expectedDate && useDelivery.getState().expectedStart
        ? new Date(`${useDelivery.getState().expectedDate}T${useDelivery.getState().expectedStart}:00+03:00`).toISOString()
        : undefined;
      const scheduledEndAt = useDelivery.getState().expectedDate && useDelivery.getState().expectedEnd
        ? new Date(`${useDelivery.getState().expectedDate}T${useDelivery.getState().expectedEnd}:00+03:00`).toISOString()
        : undefined;
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.qty,
            note: item.note || undefined,
            optionValueIds: item.options.map((option) => option.choiceId),
          })),
          mode,
          branchId,
          areaId,
          paymentMethod: payment,
          contact: { name, phone },
          address: mode === "delivery" ? { type: useDelivery.getState().addressType, block, street, building, avenue, floor, apartment, paci, additional } : null,
          scheduledStartAt,
          scheduledEndAt,
          promotionCode: promotionCode || undefined,
        }),
      });
      const order = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok) {
        setPayError(order.error || "Unable to place your order.");
        return;
      }
      if (payment === "cash") {
        router.push(`/checkout/success?order=${encodeURIComponent(order.orderNumber)}&token=${encodeURIComponent(order.trackingToken)}`);
        return;
      }
      const res = await fetch("/api/knet/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderId,
          trackingToken: order.trackingToken,
          lang: ar ? "ar" : "en",
        }),
      });
      const data = await res.json();
      if (res.ok && data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      setPayError(data.error || "Payment could not be initiated.");
    } catch {
      setPayError("Payment could not be initiated.");
    } finally {
      setPlacing(false);
    }
  };

  const sep = ar ? "، " : ", ";
  const addrLine1Rest = [
    block && `${ar ? "قطعة" : "block"} ${block}`,
    street && `${ar ? "شارع" : "Str."} ${street}`,
  ].filter(Boolean);
  const addrLine2 = [
    building && `${ar ? "مبنى" : "Building"} ${building}`,
    avenue && `${ar ? "جادة" : "Avenue"} ${avenue}`,
    floor && `${ar ? "طابق" : "Floor"} ${floor}`,
    apartment && `${ar ? "شقة" : "Apartment"} ${apartment}`,
    paci && `${ar ? "الرقم المدني" : "Civil number"} ${paci}`,
    additional,
  ]
    .filter(Boolean)
    .join(sep);

  const scheduledLabel = expectedDate && expectedStart && expectedEnd ? slotText(expectedDate, expectedStart, expectedEnd, lang) : "";

  const rowIcon = "flex h-[21px] w-[21px] shrink-0 text-[#5b5b5b]";

  const openDrawer = (key: string, qty: number) => {
    setEditing({ key, qty });
    setDraftQty(qty);
  };

  const editingItem = editing ? items.find((i) => i.key === editing.key) ?? null : null;

  return (
    <>
      <CheckoutHeader />
      <div className="w-full">
        <div className="h-[60px]" />

        <section className="mt-[30px]">
          <p className="box-title">
            {t(mode === "pickup" ? "pickupTime" : "deliveryTime")[ar ? "ar" : "en"]}
          </p>
          <div className="mt-[5px] flex h-[60px] items-center justify-between border-t border-b border-[#dee2e6] bg-white">
            <div className="flex items-center ps-[15px]">
              <DeliveryTimeIcon className="shrink-0" />
              <span className="ms-[15px] text-[14px] font-bold text-[rgba(0,0,0,0.87)]">
                {scheduledLabel}
              </span>
            </div>
            <div className="pe-[15px] text-start">
              <ChevronForwardIcon className="h-[21px] w-[21px] rotate-180 text-[#5b5b5b]" />
            </div>
          </div>
        </section>

        <section className="mt-[30px]">
          <p className="box-title">{ar ? "رمز الخصم" : "Promotion code"}</p>
          <div className="mt-[5px] border-t border-b border-[#dee2e6] bg-white p-[15px]">
            <div className="flex gap-2"><input value={promotionDraft} onChange={(event) => setPromotionDraft(event.target.value.toUpperCase())} placeholder={ar ? "أدخل الرمز" : "Enter code"} className="min-w-0 flex-1 border border-[#dee2e6] px-3 py-2 text-[14px]"/><button type="button" onClick={() => { setPromotionCode(promotionDraft.trim()); setQuoteError(null); }} className="border border-brand px-4 py-2 text-[14px] font-bold text-brand">{ar ? "تطبيق" : "Apply"}</button>{promotionCode && <button type="button" onClick={() => { setPromotionDraft(""); setPromotionCode(""); }} className="text-[13px] text-brand">{ar ? "إزالة" : "Remove"}</button>}</div>
            {quote?.promotion && <p className="mt-2 text-[13px] text-[#666]">{ar ? "تم تطبيق" : "Applied"}: {quote.promotion.name}{quote.promotion.code ? ` (${quote.promotion.code})` : ""}</p>}
            {quoteError && <p className="mt-2 text-[13px] text-red-600">{quoteError}</p>}
          </div>
        </section>

        <section className="mt-[30px]">
          <p className="box-title">
            {t(mode === "pickup" ? "pickupFrom" : "deliverTo")[ar ? "ar" : "en"]}
          </p>
          <div className="bordered mx-0 mt-[5px]">
            <div className="relative h-[138px] w-full bg-[#dbe3ec]">
              {coords != null ? (
                <DeliveryMap
                  lat={coords.lat}
                  lng={coords.lng}
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <LocationOnIcon className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[#8f9dad]" />
              )}
              {mode === "pickup" ? (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  dir={ar ? "rtl" : "ltr"}
                  className={cn(
                    "absolute top-0 bottom-0 z-[401] my-auto flex h-[35px] items-center justify-center bg-white text-[12.25px] font-medium text-[rgba(0,0,0,0.87)] shadow-[1px_1px_1px_1px_rgb(184,184,184)]",
                    ar ? "left-[15px] w-[90px]" : "right-[15px] w-[120px]"
                  )}
                >
                  <span className="mx-auto">{t("directions")[ar ? "ar" : "en"]}</span>
                  <ChevronForwardIcon className="h-[20px] w-[20px] rotate-180" />
                </a>
              ) : (
                <Link
                  href="/select/branch"
                  className="absolute top-0 bottom-0 left-[15px] z-[401] my-auto flex h-[35px] w-[75px] items-center justify-center border border-brand/50 bg-white pr-[15px] text-[12.25px] font-medium text-brand shadow-[1px_1px_1px_1px_rgb(184,184,184)]"
                >
                  <span className="ml-[6px]">{t("edit")[ar ? "ar" : "en"]}</span>
                  <ChevronForwardIcon className="h-[20px] w-[20px] rotate-180" />
                </Link>
              )}
            </div>
          </div>

          {mode === "pickup" ? (
            <>
              <Link href="/select/branch" className="block text-black">
                <div
                  dir={ar ? "rtl" : "ltr"}
                  className="flex items-center justify-between border-t border-[#dee2e6] bg-white py-[20px]"
                >
                  <span className={cn("flex w-[8.33%] shrink-0", ar ? "pr-[15px]" : "pl-[15px]")}>
                    <OfficeIcon className={rowIcon} />
                  </span>
                  <span className="flex-1 text-[16px] font-normal ps-[21px]">{branchLabel}</span>
                  <span
                    className={cn("flex w-[8.33%] shrink-0 justify-end", ar ? "pe-[11px]" : "pe-[17px]")}
                  >
                    <EditIcon className={rowIcon} />
                  </span>
                </div>
              </Link>

              <Link href="/checkout/details" className="block text-black">
                <div
                  dir={ar ? "rtl" : "ltr"}
                  className="flex min-h-[22px] items-center justify-between border-b border-[#dee2e6] bg-white pb-[21px]"
                >
                  <span className={cn("flex w-[8.33%] shrink-0", ar ? "pr-[15px]" : "pl-[15px]")}>
                    <PersonIcon className={rowIcon} />
                  </span>
                  <span className="flex-1 text-[14px] font-normal ps-[21px]">
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
                  <span
                    className={cn("flex w-[8.33%] shrink-0 justify-end", ar ? "pe-[11px]" : "pe-[17px]")}
                  >
                    <EditIcon className={rowIcon} />
                  </span>
                </div>
              </Link>
            </>
          ) : (
            <>
              <Link href="/checkout/address" className="block text-black">
                <div
                  dir={ar ? "rtl" : "ltr"}
                  className="flex items-center justify-between border-t border-[#dee2e6] bg-white py-[20px]"
                >
                  <span className={cn("flex w-[8.33%] shrink-0", ar ? "pr-[15px]" : "pl-[15px]")}>
                    <OfficeIcon className={rowIcon} />
                  </span>
                  <span className="flex-1 text-[14px] font-normal ps-[21px]">
                    <span className="mb-[7px] block leading-[20px]">
                      <b className="font-bold">{areaLabel}</b>
                      {addrLine1Rest.map((p, i) => (
                        <span key={i}>{sep + p}</span>
                      ))}
                    </span>
                    {addrLine2 && <span className="block leading-[20px]">{addrLine2}</span>}
                  </span>
                  <span
                    className={cn("flex w-[8.33%] shrink-0 justify-end", ar ? "pe-[11px]" : "pe-[17px]")}
                  >
                    <EditIcon className={rowIcon} />
                  </span>
                </div>
              </Link>

              <Link href="/checkout/details" className="block text-black">
                <div
                  dir={ar ? "rtl" : "ltr"}
                  className="flex min-h-[22px] items-center justify-between border-b border-[#dee2e6] bg-white pb-[21px]"
                >
                  <span className={cn("flex w-[8.33%] shrink-0", ar ? "pr-[15px]" : "pl-[15px]")}>
                    <PersonIcon className={rowIcon} />
                  </span>
                  <span className="flex-1 text-[14px] font-normal ps-[21px]">
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
                  <span
                    className={cn("flex w-[8.33%] shrink-0 justify-end", ar ? "pe-[11px]" : "pe-[17px]")}
                  >
                    <EditIcon className={rowIcon} />
                  </span>
                </div>
              </Link>
            </>
          )}
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
                  role="button"
                  tabIndex={0}
                  onClick={() => openDrawer(it.key, it.qty)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openDrawer(it.key, it.qty);
                    }
                  }}
                  className="-mx-[15px] flex cursor-pointer text-[14px] font-bold text-[rgba(0,0,0,0.87)]"
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
                  <li
                    key={p.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => setPayment(p.key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPayment(p.key);
                      }
                    }}
                    dir={ar ? "rtl" : "ltr"}
                    className="flex h-[51px] cursor-pointer items-center px-[16px] hover:bg-black/[0.04]"
                  >
                    <span className="flex h-[39px] w-[39px] shrink-0 items-center justify-center">
                      {active ? (
                        <svg
                          viewBox="0 0 24 24"
                          className="h-[21px] w-[21px] text-brand"
                          aria-hidden="true"
                        >
                          <path
                            fill="currentColor"
                            d="M16.59 7.58L10 14.17l-3.59-3.58L5 12l5 5 8-8zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"
                          />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          className="h-[21px] w-[21px] text-[#808080]"
                          aria-hidden="true"
                        >
                          <path
                            fill="currentColor"
                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="text-[14px] leading-[28px] text-[rgba(0,0,0,0.87)]">
                      {t(p.msg)[ar ? "ar" : "en"]}
                    </span>
                    <div className="flex-1" />
                    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
                      <p.Icon className="h-[30px] w-[30px]" />
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
            "fixed bottom-[55px] z-[1000] w-full border-t border-[#dee2e6] bg-white py-2 md:w-[41.6%]",
            ar ? "right-0" : "left-0"
          )}
        >
          {[
            { label: t("subtotal")[ar ? "ar" : "en"], value: fmtPrice(subtotal, lang), bold: false },
            ...(mode === "delivery"
              ? [{ label: t("deliveryFees")[ar ? "ar" : "en"], value: fmtPrice(fee, lang), bold: false }]
              : []),
            ...(discount > 0 ? [{ label: ar ? "الخصم" : "Discount", value: `-${fmtPrice(discount, lang)}`, bold: false }] : []),
            { label: t("total")[ar ? "ar" : "en"], value: fmtPrice(grand, lang), bold: true },
          ].map((row, i, rows) => (
            <div
              key={i}
              className={cn(
                "flex h-[23px] items-center justify-between px-[16px]",
                i < rows.length - 1 && "mb-[3.5px]"
              )}
            >
              <span
                className={cn(
                  "text-[16px] text-[rgba(0,0,0,0.87)]",
                  row.bold && "font-semibold"
                )}
              >
                {row.label}
              </span>
              <span
                className={cn(
                  "text-[16px] text-[rgba(0,0,0,0.87)]",
                  row.bold && "font-semibold"
                )}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className="h-[190px]" />

        {payError && (
          <div className="fixed inset-x-0 bottom-[104px] z-[999] mx-auto max-w-[560px] px-4">
            <div className="rounded-[6px] border border-[#ff6600]/40 bg-[#fff5ec] px-4 py-2 text-[13px] text-[#b34700]">
              {payError}
            </div>
          </div>
        )}

        <CheckoutActionBar label={t("placeOrder")[ar ? "ar" : "en"]} onClick={placeOrder} />
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-[1100]" dir={ar ? "rtl" : "ltr"}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditing(null)} />
          <div className="absolute bottom-0 left-0 right-0 mx-auto bg-[#f4f5f5] pb-[24px] pt-[16px] text-center md:w-[41.6%]">
            <h2 className="mt-[16px] mb-0 text-[24px] font-bold text-[rgba(0,0,0,0.87)]">
              {ar && editingItem.ar_name ? editingItem.ar_name : editingItem.name}
            </h2>
            <h4
              className="mt-[8px] mb-0 cursor-pointer text-[15px] font-bold text-[#ff6600]"
              onClick={() => {
                setEditing(null);
                router.push(`/product/${editingItem.categorySlug}/${editingItem.slug}`);
              }}
            >
              {t("customize")[ar ? "ar" : "en"]}
            </h4>
            <hr className="my-[16px] border-[#d8d8d8]" />
            <div className="flex w-full items-center justify-center gap-[40px]">
              <button
                type="button"
                onClick={() => setDraftQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                <MinusIcon />
              </button>
              <h1 className="m-0 min-w-[40px] text-[28px] font-bold leading-[1.3] text-[rgba(0,0,0,0.87)]">
                {draftQty}
              </h1>
              <button
                type="button"
                onClick={() => setDraftQty((q) => q + 1)}
                aria-label="Increase quantity"
              >
                <PlusIcon />
              </button>
            </div>
            <h5 className="mt-[10px] mb-0 text-[14px] font-bold text-[#6c757d]">
              {t("pricePrefix")[ar ? "ar" : "en"]}
              {fmtPrice(editingItem.price * draftQty, lang)}
            </h5>
            <hr className="my-[16px] border-[#d8d8d8]" />
            <div className="flex items-center justify-center gap-[30px]">
              <button
                type="button"
                onClick={() => {
                  setQty(editingItem.key, draftQty);
                  setEditing(null);
                }}
                className="text-[12.25px] font-medium tracking-[0.4px] text-[#2e7d32]"
              >
                {t("save")[ar ? "ar" : "en"]}
              </button>
              <button
                type="button"
                onClick={() => {
                  removeItem(editingItem.key);
                  setEditing(null);
                }}
                className="text-[12.25px] font-medium tracking-[0.4px] text-[#d32f2f]"
              >
                {t("delete")[ar ? "ar" : "en"]}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
