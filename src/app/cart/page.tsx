"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { SubHeader, MobilePageHeader } from "@/components/Header";
import ReviewOrderBar from "@/components/ReviewOrderBar";
import { useCart, useLang } from "@/lib/state";
import { fmtPricePrefix } from "@/lib/utils";

const messages: Record<string, { en: string; ar: string }> = {
  myCart: { en: "Shopping Cart", ar: "سلة المشتريات" },
  emptyCart: { en: "Your cart is empty", ar: "سلة مشترياتك فارغة" },
  startShopping: { en: "Start shopping", ar: "ابدأ التسوق" },
  edit: { en: "edit", ar: "تعديل" },
  remove: { en: "remove", ar: "إزالة" },
  specialRemarks: { en: "Special Remarks", ar: "ملاحظات" },
  remarksPlaceholder: { en: "Enter your Special Remarks", ar: "ادخل ملاحظات" },
  items: { en: "Items", ar: "المنتجات" },
};

function t(lang: "ar" | "en", key: string): string {
  const m = (messages as Record<string, { en: string; ar: string }>)[key];
  if (!m) return key;
  return lang === "ar" && m.ar ? m.ar : m.en;
}

export default function CartPage() {
  const router = useRouter();
  const lang = useLang((s) => s.lang);
  const ar = lang === "ar";
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const [remarks, setRemarks] = useState("");
  const [remarksFocused, setRemarksFocused] = useState(false);
  const remarksShrunk = remarksFocused || remarks.length > 0;

  if (items.length === 0) {
    return (
      <>
        <MobilePageHeader title={t(lang, "myCart")} />
        <div className="hidden lg:block">
          <SubHeader title={t(lang, "myCart")} showCart={false} showLang={false} />
        </div>
        <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
          <ShoppingCart size={48} className="text-[#ccc]" />
          <p className="text-[15px] text-[#666]">{t(lang, "emptyCart")}</p>
          <Link
            href="/"
            className="rounded bg-brand px-6 py-2 text-[14px] font-bold text-white"
          >
            {t(lang, "startShopping")}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <MobilePageHeader title={t(lang, "myCart")} />
      <div className="hidden lg:block">
        <SubHeader title={t(lang, "myCart")} showCart={false} showLang={false} />
      </div>
      <div className="pt-[55px] pb-[70px] lg:pt-0">
        <div style={{ marginTop: "30px" }}>
          <p className="box-title" style={{ textAlign: ar ? "right" : "left" }}>
            {t(lang, "specialRemarks")}
          </p>
          <div
            className="bordered"
            style={{
              backgroundColor: "white",
              minHeight: "80px",
              display: "grid",
              gridTemplateColumns: "50px auto 50px",
              alignItems: "center",
              direction: ar ? "rtl" : "ltr",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <svg className="MuiSvgIcon-root" focusable="false" viewBox="0 0 24 24" aria-hidden="true" style={{ color: "rgb(91, 91, 91)" }}>
                <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM20 4v13.17L18.83 16H4V4h16zM6 12h12v2H6zm0-3h12v2H6zm0-3h12v2H6z" />
              </svg>
            </div>
            <div>
              <div
                className="MuiFormControl-root MuiTextField-root MuiFormControl-fullWidth"
                style={{ width: "100%", position: "relative", top: "-10px", left: "0px", paddingTop: "16px" }}
              >
                <label
                  className="MuiFormLabel-root MuiInputLabel-root MuiInputLabel-formControl MuiInputLabel-animated"
                  data-shrink={remarksShrunk ? "true" : "false"}
                  dir={ar ? "rtl" : "ltr"}
                  style={{
                    position: "absolute",
                    top: "0px",
                    transform: remarksShrunk ? "translate(0px, 1.5px) scale(0.75)" : "translateY(24px)",
                    transition: "transform 200ms cubic-bezier(0, 0, 0.2, 1) 0ms",
                    transformOrigin: ar ? "right top" : "left top",
                    right: ar ? "0px" : "unset",
                    left: ar ? "unset" : "0px",
                    color: "rgb(108, 117, 125)",
                    fontSize: "14px",
                    lineHeight: "14px",
                    fontWeight: 400,
                    pointerEvents: "none",
                    fontFamily: "Quicksand, Cairo, sans-serif",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t(lang, "remarksPlaceholder")}
                </label>
                <div
                  className="MuiInputBase-root MuiInput-root MuiInput-underline MuiInputBase-fullWidth MuiInput-fullWidth MuiInputBase-formControl MuiInput-formControl"
                  dir={ar ? "rtl" : "ltr"}
                >
                  <input
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    onFocus={() => setRemarksFocused(true)}
                    onBlur={() => setRemarksFocused(false)}
                    type="text"
                    className="MuiInputBase-input MuiInput-input"
                    style={{ fontSize: "14px", padding: "6px 0 7px", background: "transparent", width: "100%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "30px" }}>
          <p className="box-title" style={{ textAlign: ar ? "right" : "left" }}>
            {t(lang, "items")}
          </p>
          <div className="bordered">
            <div style={{ padding: "7px 5px", background: "white" }}>
              {items.map((it, idx) => {
                const name = ar && it.ar_name ? it.ar_name : it.name;
                const variant = it.options.map((o) => o.label).filter(Boolean).join(", ");
                return (
                  <Fragment key={it.key}>
                    <div style={{ padding: "5px 10px", backgroundColor: "white", margin: "5px 0px" }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "50px auto 90px",
                          gridTemplateRows: "60px auto 30px",
                          alignItems: "center",
                          direction: ar ? "rtl" : "ltr",
                        }}
                      >
                        <div style={{ textAlign: "center" }}>
                          <div className="mb-2">
                            <span
                              className="bold"
                              style={{
                                cursor: "pointer",
                                fontSize: "0.9rem",
                                color: "rgb(255, 102, 0)",
                                position: "relative",
                                ...(ar ? { left: "10px" } : { right: "10px" }),
                              }}
                              onClick={() => router.push(`/product/${it.categorySlug}/${it.slug}`)}
                            >
                              {t(lang, "edit")}
                            </span>
                          </div>
                          <img
                            alt={name}
                            src={it.photo}
                            style={{ borderRadius: "4px", width: "50px", height: "50px" }}
                          />
                        </div>
                        <div style={{ textAlign: ar ? "right" : "left", paddingLeft: ar ? "0" : "14px", paddingRight: ar ? "14px" : "0" }}>
                          <span className="bold">{name}</span>
                          {variant && <p className="text-[12px] text-[#666]">{variant}</p>}
                          {it.note && <p className="text-[12px] text-[#888]">{it.note}</p>}
                        </div>
                        <div
                          className="bold"
                          style={{
                            direction: ar ? "ltr" : "rtl",
                            textAlign: ar ? "left" : "right",
                            color: "rgb(255, 102, 0)",
                            fontSize: "1rem",
                            width: "100%",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span className="bold">{fmtPricePrefix(it.price * it.qty, lang)}</span>
                        </div>
                        <div className="empty" />
                        <div>
                          <div className="ml-2" style={{ textAlign: ar ? "right" : "left" }} />
                        </div>
                        <div className="empty" />
                        <div style={{ textAlign: "center" }}>
                          <span
                            className="bold"
                            style={{
                              color: "rgb(255, 66, 66)",
                              cursor: "pointer",
                              fontSize: "0.9rem",
                              position: "relative",
                              ...(ar ? { left: "10px" } : {}),
                            }}
                            onClick={() => remove(it.key)}
                          >
                            {t(lang, "remove")}
                          </span>
                        </div>
                        <div className="empty" />
                        <div>
                          <div
                            className="MuiGrid-root mx-auto mt-1 MuiGrid-container MuiGrid-align-items-xs-center MuiGrid-justify-xs-space-around"
                            style={{
                              width: "95px",
                              backgroundColor: "white",
                              height: "30px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-around",
                              flexDirection: ar ? "row-reverse" : "row",
                            }}
                          >
                            <div
                              className="MuiGrid-root option-quantity-button MuiGrid-item"
                              style={{ width: "21px", display: "block", cursor: it.qty <= 1 ? "default" : "pointer" }}
                              onClick={() => { if (it.qty > 1) setQty(it.key, it.qty - 1); }}
                            >
                              <svg className="MuiSvgIcon-root" focusable="false" viewBox="0 0 24 24" aria-hidden="true" style={{ color: it.qty <= 1 ? "rgb(216, 216, 216)" : "rgb(255, 102, 0)" }}>
                                <path d="M7 11v2h10v-2H7zm5-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                              </svg>
                            </div>
                            <div className="MuiGrid-root MuiGrid-item">
                              <div
                                className="text-center"
                                style={{ color: "rgb(255, 102, 0)", border: "0.5px solid rgb(222, 222, 222)", borderRadius: "5px", width: "35px", padding: "1px", textAlign: "center", fontSize: "1rem" }}
                              >
                                {it.qty}
                              </div>
                            </div>
                            <div
                              className="MuiGrid-root option-quantity-button MuiGrid-item"
                              style={{ width: "21px", display: "block", cursor: "pointer" }}
                              onClick={() => setQty(it.key, it.qty + 1)}
                            >
                              <svg className="MuiSvgIcon-root" focusable="false" viewBox="0 0 24 24" aria-hidden="true" style={{ color: "rgb(255, 102, 0)" }}>
                                <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {idx < items.length - 1 && (
                      <hr
                        className="MuiDivider-root MuiDivider-middle"
                        style={{ margin: "12px 30px", border: "0", borderBottom: "1px solid rgba(0,0,0,0.12)", height: "0" }}
                      />
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ height: "150px" }} />

        <ReviewOrderBar href="/checkout" />
      </div>
    </>
  );
}
