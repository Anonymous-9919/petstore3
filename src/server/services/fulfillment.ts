import "server-only";

import { db } from "@/server/db";

export type FulfillmentMode = "delivery" | "pickup";
export type FulfillmentSlot = { start: string; end: string; active: boolean };
export type FulfillmentDay = { key: string; active: boolean; slots: FulfillmentSlot[] };

const KUWAIT_OFFSET_MS = 3 * 60 * 60 * 1000;

function kuwaitDate(value = new Date()) {
  return new Date(value.getTime() + KUWAIT_OFFSET_MS);
}

function keyFor(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function minutes(time: string) {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

function hhmm(value: number) {
  return `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export async function storefrontFulfillment() {
  const branches = await db.branch.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      legacyId: true, publicId: true, name: true, nameAr: true, address: true, addressAr: true, phone: true, latitude: true, longitude: true, deliveryEnabled: true, pickupEnabled: true,
      coverage: {
        where: { isActive: true, area: { isActive: true } },
        orderBy: [{ priority: "asc" }, { area: { name: "asc" } }],
        select: { priority: true, deliveryFee: true, minimumOrderValue: true, area: { select: { legacyId: true, publicId: true, name: true, nameAr: true, latitude: true, longitude: true, province: { select: { name: true, nameAr: true, sortOrder: true } } } } },
      },
    },
  });
  const pickupBranches = branches.filter((branch) => branch.pickupEnabled).map((branch) => ({
    id: branch.legacyId ?? branch.publicId, public_id: branch.publicId, name: branch.name, nameAr: branch.nameAr, address: branch.address, addressAr: branch.addressAr, phone: branch.phone,
    latitude: branch.latitude?.toString() ?? null, longitude: branch.longitude?.toString() ?? null,
  }));
  const coverage = branches.flatMap((branch) => branch.deliveryEnabled ? branch.coverage
    .map((item) => ({ branchId: branch.legacyId ?? branch.publicId, branchName: branch.name, branchNameAr: branch.nameAr, priority: item.priority, fee: item.deliveryFee.toString(), minimumOrderValue: item.minimumOrderValue.toString(), area: item.area })) : []);
  coverage.sort((left, right) => left.priority - right.priority || left.branchName.localeCompare(right.branchName));
  const areas = new Map<number, typeof coverage[number]>();
  for (const item of coverage) if (!areas.has(item.area.legacyId ?? item.area.publicId)) areas.set(item.area.legacyId ?? item.area.publicId, item);
  const provinces = new Map<string, { name: string; nameAr: string; sortOrder: number; areas: Array<object> }>();
  for (const item of areas.values()) {
    const province = item.area.province;
    const entry = provinces.get(province.name) ?? { ...province, areas: [] };
    entry.areas.push({ id: item.area.legacyId ?? item.area.publicId, public_id: item.area.publicId, name: item.area.name, nameAr: item.area.nameAr, latitude: item.area.latitude?.toString() ?? null, longitude: item.area.longitude?.toString() ?? null, branchId: item.branchId, branchName: item.branchName, branchNameAr: item.branchNameAr, fee: item.fee, minimumOrderValue: item.minimumOrderValue });
    provinces.set(province.name, entry);
  }
  return { branches: pickupBranches, provinces: [...provinces.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)) };
}

export async function fulfillmentSlots(branchLegacyId: number, mode: FulfillmentMode): Promise<FulfillmentDay[]> {
  const branch = await db.branch.findFirst({ where: { OR: [{ legacyId: branchLegacyId }, { publicId: branchLegacyId }], isActive: true, ...(mode === "delivery" ? { deliveryEnabled: true } : { pickupEnabled: true }) }, select: { hours: true } });
  if (!branch) return [];
  const hours = new Map(branch.hours.map((hour) => [hour.dayOfWeek, hour]));
  const now = kuwaitDate();
  const days: FulfillmentDay[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() + offset);
    const hour = hours.get(date.getUTCDay());
    const slots: FulfillmentSlot[] = [];
    if (hour && !hour.isClosed) {
      const open = minutes(hour.opensAt);
      const close = minutes(hour.closesAt);
      const duration = mode === "delivery" ? 240 : 30;
      const step = mode === "delivery" ? 60 : 30;
      for (let start = open; start + duration <= close; start += step) {
        const startsAt = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), Math.floor(start / 60) - 3, start % 60);
        slots.push({ start: hhmm(start), end: hhmm(start + duration), active: startsAt > Date.now() });
      }
    }
    days.push({ key: keyFor(date), active: slots.some((slot) => slot.active), slots });
  }
  return days;
}

export async function storefrontBranch(branchLegacyId: number) {
  const branch = await db.branch.findFirst({ where: { OR: [{ legacyId: branchLegacyId }, { publicId: branchLegacyId }], isActive: true }, select: { legacyId: true, publicId: true, name: true, nameAr: true, address: true, addressAr: true, phone: true, latitude: true, longitude: true, hours: true } });
  if (!branch) return null;
  return { id: branch.legacyId ?? branch.publicId, public_id: branch.publicId, name: branch.name, nameAr: branch.nameAr, address: branch.address, addressAr: branch.addressAr, phone: branch.phone, latitude: branch.latitude?.toString() ?? null, longitude: branch.longitude?.toString() ?? null, hours: branch.hours };
}

export async function isValidFulfillmentSlot(branchId: number, mode: FulfillmentMode, startAt?: string, endAt?: string) {
  if (!startAt && !endAt) return true;
  if (!startAt || !endAt) return false;
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return false;
  const local = kuwaitDate(start);
  const slots = await fulfillmentSlots(branchId, mode);
  return slots.some((day) => day.key === keyFor(local) && day.slots.some((slot) => slot.active && slot.start === `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}` && slot.end === `${String(kuwaitDate(end).getUTCHours()).padStart(2, "0")}:${String(kuwaitDate(end).getUTCMinutes()).padStart(2, "0")}`));
}
