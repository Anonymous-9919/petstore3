import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { deliveryData, storeData } from "@/data/loader";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAreaLatLng(
  areaId: number | null | undefined
): { lat: number; lng: number } | null {
  if (areaId == null) return null;
  const charges = (
    deliveryData as unknown as {
      branch_delivery_charges: Array<{ area_id: number; area_lat?: string; area_lng?: string }>;
    }
  ).branch_delivery_charges;
  const a = charges.find((x) => x.area_id === areaId);
  if (!a || !a.area_lat || !a.area_lng) return null;
  const lat = parseFloat(a.area_lat);
  const lng = parseFloat(a.area_lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371e3;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface NearestArea {
  id: number;
  area_id: number;
  branch: number;
  name: string;
  ar_name: string;
  price: number;
  lat: number;
  lng: number;
}

export function nearestAreaByLatLng(
  lat: number,
  lng: number,
  branchId?: number | null
): NearestArea | null {
  const charges = (
    deliveryData as unknown as {
      branch_delivery_charges: Array<{
        area_id: number;
        area_lat?: string;
        area_lng?: string;
        name: string;
        ar_name: string;
        id: number;
        branch: number;
        price: number;
      }>;
    }
  ).branch_delivery_charges;
  let candidates = charges;
  if (branchId != null) {
    const scoped = charges.filter((c) => c.branch === branchId);
    if (scoped.length) candidates = scoped;
  }
  let best: NearestArea | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    if (!c.area_lat || !c.area_lng) continue;
    const clat = parseFloat(c.area_lat);
    const clng = parseFloat(c.area_lng);
    if (Number.isNaN(clat) || Number.isNaN(clng)) continue;
    const dist = haversine(lat, lng, clat, clng);
    if (dist < bestDist) {
      bestDist = dist;
      best = {
        id: c.id,
        area_id: c.area_id,
        branch: c.branch,
        name: c.name,
        ar_name: c.ar_name,
        price: c.price,
        lat: clat,
        lng: clng,
      };
    }
  }
  return best;
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ display_name?: string; house_number?: string; road?: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`,
      {
        headers: { "User-Agent": "petstore3/1.0 (+https://petstorekuwait.com)" },
      }
    );
    if (!res.ok) return null;
    return (await res.json()) as {
      display_name?: string;
      house_number?: string;
      road?: string;
    };
  } catch {
    return null;
  }
}

export function fmtPrice(price: number, lang: "ar" | "en"): string {
  const label = lang === "ar" ? "دك" : "KD";
  return `${price.toFixed(3)} ${label}`;
}

export function fmtPricePrefix(price: number, lang: "ar" | "en"): string {
  const label = lang === "ar" ? "دك" : "KD";
  return `${label} ${price.toFixed(3)}`;
}

export function discountPercent(price: number, striked: number | null | undefined): number {
  if (!striked || striked <= price) return 0;
  return Math.round(((striked - price) / striked) * 100);
}

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "اغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const AR_WEEKDAYS = [
  "الأحد", "الاثنين", "الثلاثاء", "الاربعاء", "الخميس", "الجمعة", "السبت"
];

function fmtTime12(d: Date, ar: boolean): string {
  const h = ((d.getHours() + 11) % 12) + 1;
  const m = d.getMinutes().toString().padStart(2, "0");
  if (ar) {
    const ap = d.getHours() < 12 ? "ص" : "م";
    return `${h}:${m} ${ap}`;
  }
  const ap = d.getHours() < 12 ? "AM" : "PM";
  return `${h}:${m} ${ap}`;
}

function fmtLabel(d: Date, ar: boolean): string {
  if (ar) return `${d.getDate()} ${AR_MONTHS[d.getMonth()]}`;
  const m = d.toLocaleDateString("en-US", { month: "short" });
  return `${d.getDate()} ${m}`;
}

function rangeFrom(from: Date, to: Date, lang: "ar" | "en") {
  const ar = lang === "ar";
  return {
    label: fmtLabel(from, ar),
    from: fmtTime12(from, ar),
    to: fmtTime12(to, ar),
  };
}

export function deliveryRange(lang: "ar" | "en"): { label: string; from: string; to: string } {
  const d = new Date();
  const from = new Date(d);
  from.setMinutes(0, 0, 0);
  from.setHours(from.getHours() + 1);
  const to = new Date(from);
  to.setHours(to.getHours() + 4);
  const midnight = new Date(from);
  midnight.setHours(24, 0, 0, 0);
  if (to.getTime() > midnight.getTime()) to.setTime(midnight.getTime());
  return rangeFrom(from, to, lang);
}

export function pickupRange(lang: "ar" | "en"): { label: string; from: string; to: string } {
  const now = new Date();
  const slot = 30 * 60 * 1000;
  const from = new Date(Math.ceil(now.getTime() / slot) * slot);
  const to = new Date(from.getTime() + slot);
  return rangeFrom(from, to, lang);
}

export type TimeSlot = { start: string; end: string };
export type ActiveTimeSlot = TimeSlot & { active: boolean };
export type ScheduleDay = { key: string; active: boolean; slots: ActiveTimeSlot[] };

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function hmOf(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayKey(): string {
  return dayKey(new Date());
}

export function tomorrowKey(): string {
  return dayKey(addDays(new Date(), 1));
}

function parseKey(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dateLongLabel(d: Date, ar: boolean): string {
  const dd = pad2(d.getDate());
  if (ar) {
    return `${AR_WEEKDAYS[d.getDay()]} ${AR_MONTHS[d.getMonth()]} ${dd}`;
  }
  const wd = d.toLocaleDateString("en-US", { weekday: "long" });
  const m = d.toLocaleDateString("en-US", { month: "short" });
  return `${wd} ${m} ${dd}`;
}

export function asapSlot(mode: "delivery" | "pickup"): { start: string; end: string } {
  const now = new Date();
  if (mode === "delivery") {
    const from = new Date(now);
    from.setMinutes(0, 0, 0);
    from.setHours(from.getHours() + 1);
    const to = new Date(from);
    to.setHours(to.getHours() + 4);
    const midnight = new Date(from);
    midnight.setHours(24, 0, 0, 0);
    if (to.getTime() > midnight.getTime()) to.setTime(midnight.getTime());
    return { start: hmOf(from), end: hmOf(to) };
  }
  const slot = 30 * 60 * 1000;
  const from = new Date(Math.ceil(now.getTime() / slot) * slot);
  return { start: hmOf(from), end: hmOf(new Date(from.getTime() + slot)) };
}

export function scheduledDays(mode: "delivery" | "pickup"): ScheduleDay[] {
  const settings = (storeData.settings || {}) as Record<string, unknown>;
  const total = Number(settings.scheduled_days) || 7;
  const now = new Date();

  const buildSlots = (d: Date): ActiveTimeSlot[] => {
    const key = dayKey(d);
    const slots: ActiveTimeSlot[] = [];
    if (mode === "delivery") {
      for (let startMin = 10 * 60; startMin <= 20 * 60; startMin += 60) {
        const endMin = Math.min(startMin + 240, 23 * 60);
        const start = parseKey(key);
        start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
        const end = parseKey(key);
        end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
        slots.push({
          start: `${pad2(Math.floor(startMin / 60))}:${pad2(startMin % 60)}`,
          end: `${pad2(Math.floor(endMin / 60) % 24)}:${pad2(endMin % 60)}`,
          active: start.getTime() > now.getTime(),
        });
      }
    } else {
      for (let startMin = 10 * 60; startMin + 30 < 23 * 60; startMin += 30) {
        const endMin = startMin + 30;
        const start = parseKey(key);
        start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
        const end = parseKey(key);
        end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
        slots.push({
          start: `${pad2(Math.floor(startMin / 60))}:${pad2(startMin % 60)}`,
          end: `${pad2(Math.floor(endMin / 60) % 24)}:${pad2(endMin % 60)}`,
          active: start.getTime() > now.getTime(),
        });
      }
    }
    return slots;
  };

  const day0Slots = buildSlots(addDays(now, 0));
  const startOffset = day0Slots.some((s) => s.active) ? 0 : 1;

  const days: ScheduleDay[] = [];
  for (let i = 0; i < total; i++) {
    const d = addDays(now, startOffset + i);
    const slots = buildSlots(d);
    days.push({ key: dayKey(d), active: slots.length > 0, slots });
  }
  return days;
}

export function fmtHHMM(hm: string, ar: boolean): string {
  const [h, m] = hm.split(":").map(Number);
  const h12 = ((h + 11) % 12) + 1;
  const mm = pad2(m);
  const ap = ar ? (h < 12 ? "ص" : "م") : h < 12 ? "AM" : "PM";
  return `${h12}:${mm} ${ap}`;
}

export function dateOptionLabel(key: string, lang: "ar" | "en"): string {
  return dateLongLabel(parseKey(key), lang === "ar");
}

export function slotRangeText(start: string, end: string, lang: "ar" | "en"): string {
  const ar = lang === "ar";
  return `${fmtHHMM(start, ar)} ${ar ? "إلى" : "to"} ${fmtHHMM(end, ar)}`;
}

export function slotText(key: string, start: string, end: string, lang: "ar" | "en"): string {
  const ar = lang === "ar";
  const label = fmtLabel(parseKey(key), ar);
  return ar
    ? `${label}، ${fmtHHMM(start, ar)} الى ${fmtHHMM(end, ar)}`
    : `${label}, ${fmtHHMM(start, ar)} to ${fmtHHMM(end, ar)}`;
}

export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

const UNSAFE = /<script[\s\S]*?<\/script\s*>/gi;
const EVENT_ATTRS = /\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URI = /\s(href|src)\s*=\s*["']?javascript:[^"'>]*["']?/gi;

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(UNSAFE, "")
    .replace(EVENT_ATTRS, "")
    .replace(JAVASCRIPT_URI, "")
    .trim();
}

export function inStock(p: { not_available?: boolean; inventory_on_hand?: number | null }): boolean {
  if (p.not_available) return false;
  if (typeof p.inventory_on_hand === "number" && p.inventory_on_hand <= 0) return false;
  return true;
}
