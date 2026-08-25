import "server-only";

import { unstable_cache } from "next/cache";
import { db } from "@/server/db";

export const getStorefrontPopups = unstable_cache(
  () => process.env.E2E_STATIC_FIXTURES === "1" ? Promise.resolve([]) : db.popup.findMany({
    where: { status: "ACTIVE", isEnabled: true },
    select: { id: true, title: true, titleAr: true, body: true, bodyAr: true, imagePath: true, ctaLabel: true, ctaLabelAr: true, ctaUrl: true, couponCode: true, pageTarget: true, delaySeconds: true, trigger: true, scrollPercentage: true, device: true, frequency: true, frequencyDays: true, startsAt: true, endsAt: true },
    orderBy: { createdAt: "desc" },
  }),
  ["storefront-popups"],
  { tags: ["storefront-popups"] },
);
