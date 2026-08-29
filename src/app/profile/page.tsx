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
import { useEffect, useState } from "react";
import { useLang } from "@/lib/state";

export default function ProfilePage() {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const t = getMsg;
  const ar = lang === "ar";
  const [customer, setCustomer] = useState<{ name: string } | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/customer/session").then((response) => response.json()).then((data) => setCustomer(data.customer ?? null)).catch(() => setCustomer(null));
  }, []);

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
        {customer === null ? (
          <Link href="/account" className="mb-3 flex items-center justify-between rounded-[7px] bg-white px-4 py-4 text-[14px] font-medium text-brand shadow-sm">
            <span>{ar ? "سجل الدخول لإدارة حسابك وطلباتك" : "Sign in to manage your account and orders"}</span>
            <ChevronLeft size={18} className="rtl:rotate-180" />
          </Link>
        ) : customer ? <div className="mb-3 rounded-[7px] bg-white px-4 py-4 text-[14px] font-bold text-ink shadow-sm">{ar ? `مرحباً، ${customer.name}` : `Hello, ${customer.name}`}</div> : null}
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

        {customer && <button
          type="button"
          onClick={async () => {
            await fetch("/api/customer/session", { method: "DELETE" });
            window.location.href = "/profile";
          }}
          className="mt-3 flex w-full items-center gap-3 rounded-[7px] bg-white px-4 py-4 text-[14px] font-medium text-[#e74c3c] shadow-sm"
        >
          <LogOut size={18} />
          {t("logout")[ar ? "ar" : "en"]}
        </button>}
      </div>
    </>
  );
}
