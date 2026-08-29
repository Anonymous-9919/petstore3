"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { popupIsSeen } from "@/lib/popup-targeting";

type Popup = { id: string; title: string; titleAr: string; body: string | null; bodyAr: string | null; imagePath: string | null; ctaLabel: string | null; ctaLabelAr: string | null; ctaUrl: string | null; couponCode: string | null; pageTarget: "ALL" | "HOME" | "CATEGORY" | "PRODUCT" | "CART"; delaySeconds: number; trigger: "DELAY" | "SCROLL" | "EXIT_INTENT"; scrollPercentage: number | null; device: "ALL" | "DESKTOP" | "MOBILE"; frequency: "EVERY_VISIT" | "ONCE_PER_SESSION" | "ONCE_PER_DAY" | "ONCE_PER_X_DAYS"; frequencyDays: number | null; startsAt: Date | string | null; endsAt: Date | string | null };

function target(path: string): Popup["pageTarget"] { if (path === "/") return "HOME"; if (path.startsWith("/category/")) return "CATEGORY"; if (path.startsWith("/product/")) return "PRODUCT"; if (path.startsWith("/cart")) return "CART"; return "ALL"; }
function seen(popup: Popup) { const key = `popup:${popup.id}`; return popupIsSeen(popup.frequency, popup.frequencyDays, popup.frequency === "ONCE_PER_SESSION" ? sessionStorage.getItem(key) : localStorage.getItem(key)); }
function markSeen(popup: Popup) { const key = `popup:${popup.id}`; if (popup.frequency === "ONCE_PER_SESSION") sessionStorage.setItem(key, "1"); else if (popup.frequency !== "EVERY_VISIT") localStorage.setItem(key, new Date().toISOString()); }

export function StorefrontPopups({ popups }: { popups: Popup[] }) {
  const pathname = usePathname();
  const [popup, setPopup] = useState<Popup | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const now = Date.now(); const device = window.innerWidth < 768 ? "MOBILE" : "DESKTOP";
    const match = popups.find((item) => (item.pageTarget === "ALL" || item.pageTarget === target(pathname)) && (item.device === "ALL" || item.device === device) && (!item.startsAt || new Date(item.startsAt).getTime() <= now) && (!item.endsAt || new Date(item.endsAt).getTime() > now) && !seen(item));
    if (!match) return;
    const show = () => { markSeen(match); setCopied(false); setPopup(match); void fetch("/api/storefront/popups/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ popupId: match.id, type: "IMPRESSION", pageTarget: target(pathname), device }) }); };
    if (match.trigger === "DELAY") { const timer = window.setTimeout(show, match.delaySeconds * 1000); return () => window.clearTimeout(timer); }
    if (match.trigger === "SCROLL") {
      const onScroll = () => { const maximum = document.documentElement.scrollHeight - window.innerHeight; if (maximum > 0 && window.scrollY / maximum * 100 >= (match.scrollPercentage ?? 100)) { window.removeEventListener("scroll", onScroll); show(); } };
      window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll);
    }
    if (device === "DESKTOP") { const onExit = (event: MouseEvent) => { if (event.clientY <= 0) { document.removeEventListener("mouseout", onExit); show(); } }; document.addEventListener("mouseout", onExit); return () => document.removeEventListener("mouseout", onExit); }
  }, [pathname, popups]);

  if (!popup) return null;
  const arabic = document.documentElement.lang.startsWith("ar"); const title = arabic ? popup.titleAr : popup.title; const body = arabic ? popup.bodyAr : popup.body; const label = arabic ? popup.ctaLabelAr : popup.ctaLabel;
  const click = () => { void fetch("/api/storefront/popups/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ popupId: popup.id, type: "CLICK", pageTarget: target(pathname), device: window.innerWidth < 768 ? "MOBILE" : "DESKTOP" }) }); };
  const copyCoupon = () => { if (popup.couponCode) void navigator.clipboard.writeText(popup.couponCode); setCopied(true); click(); };
  return <div role="dialog" aria-modal="true" aria-labelledby="popup-title" className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4" onMouseDown={() => setPopup(null)}><section className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><button aria-label="Close" onClick={() => setPopup(null)} className="absolute right-3 top-2 z-10 text-2xl leading-none text-black/60">x</button>{popup.imagePath && <Image src={popup.imagePath} alt="" width={800} height={400} className="h-44 w-full object-cover"/>}<div className="space-y-3 p-6"><h2 id="popup-title" className="pr-6 text-2xl font-bold">{title}</h2>{body && <p className="text-sm text-black/70">{body}</p>}{popup.couponCode && <button onClick={copyCoupon} className="rounded border border-dashed border-brand px-3 py-2 text-sm font-bold text-brand">{copied ? "Copied" : popup.couponCode}</button>}{popup.ctaUrl && <a href={popup.ctaUrl} onClick={click} className="block w-fit rounded bg-brand px-4 py-2 text-sm font-bold text-white">{label ?? (arabic ? "Shop now" : "Shop now")}</a>}{!popup.ctaUrl && popup.couponCode && <button onClick={copyCoupon} className="block w-fit rounded bg-brand px-4 py-2 text-sm font-bold text-white">{label ?? "Copy coupon"}</button>}</div></section></div>;
}
