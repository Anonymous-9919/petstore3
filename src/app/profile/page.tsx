"use client";

import Link from "next/link";
import {
  ChevronLeft,
  Globe,
  Heart,
  History,
  LogOut,
  MessageCircle,
  PhoneCall,
  Truck,
} from "lucide-react";
import { SubHeader } from "@/components/Header";
import { getMsg } from "@/lib/i18n";
import { useLang } from "@/lib/state";

export default function ProfilePage() {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const t = getMsg;
  const ar = lang === "ar";

  const items = [
    { href: "/track/order", icon: Truck, label: t("trackOrder")[ar ? "ar" : "en"] },
    { href: "/profile/orders", icon: History, label: t("previousOrders")[ar ? "ar" : "en"] },
    { href: "/favorites", icon: Heart, label: t("myFavorites")[ar ? "ar" : "en"] },
    { href: "/contact", icon: PhoneCall, label: t("contactUs")[ar ? "ar" : "en"] },
    { href: "/wallet", icon: MessageCircle, label: t("wallet")[ar ? "ar" : "en"] },
  ];

  return (
    <>
      <SubHeader title={t("myAccount")[ar ? "ar" : "en"]} />
      <div className="px-4 py-4">
        <div className="rounded-[7px] bg-white shadow-sm">
          {items.map((it, i) => (
            <Link
              key={it.href}
              href={it.href}
              className="flex items-center gap-3 border-b border-[#f0f0f0] px-4 py-4 last:border-0"
            >
              <it.icon size={18} className="text-[#555]" />
              <span className="flex-1 text-[14px] font-medium text-ink">{it.label}</span>
              <ChevronLeft size={18} className="text-[#999] rtl:rotate-180" />
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="mt-3 flex w-full items-center gap-3 rounded-[7px] bg-white px-4 py-4 text-[14px] font-medium text-ink shadow-sm"
        >
          <Globe size={18} className="text-[#555]" />
          <span className="flex-1 text-left rtl:text-right">
            {ar ? "English" : "العربية"}
          </span>
          <span className="rounded bg-page px-2 py-1 text-[12px] font-bold text-brand">
            {lang.toUpperCase()}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("ps-cart");
            window.location.href = "/";
          }}
          className="mt-3 flex w-full items-center gap-3 rounded-[7px] bg-white px-4 py-4 text-[14px] font-medium text-[#e74c3c] shadow-sm"
        >
          <LogOut size={18} />
          {t("logout")[ar ? "ar" : "en"]}
        </button>
      </div>
    </>
  );
}
