import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { db } from "@/server/db";

// Scheduled popups must be evaluated at request time; a static cache can serve
// a popup after expiry or hide one after its start time.
export async function getStorefrontPopups() {
  noStore();
  if (process.env.E2E_STATIC_FIXTURES === "1") return [];
  return db.popup.findMany({
    where: { status: "ACTIVE", isEnabled: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }] },
    select: { id: true, title: true, titleAr: true, body: true, bodyAr: true, imagePath: true, ctaLabel: true, ctaLabelAr: true, ctaUrl: true, couponCode: true, pageTarget: true, delaySeconds: true, trigger: true, scrollPercentage: true, device: true, frequency: true, frequencyDays: true, startsAt: true, endsAt: true },
    orderBy: { createdAt: "desc" },
  });
}
