import "server-only";

import { db } from "@/server/db";

export type ScheduledContent = { startsAt: Date | null; endsAt: Date | null };

export function isScheduledContentActive(content: ScheduledContent, now = new Date()) {
  return (!content.startsAt || content.startsAt <= now) && (!content.endsAt || content.endsAt > now);
}

export async function getHomepageStorefrontContent(now = new Date()) {
  if (process.env.E2E_STATIC_FIXTURES === "1") {
    return { banners: [], announcement: null };
  }

  const [assets, setting] = await Promise.all([
    db.storeAsset.findMany({
      where: { kind: "HOMEPAGE_BANNER", placement: { in: ["HOMEPAGE", "HERO"] }, status: "ACTIVE", archivedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { path: true, mobilePath: true, alt: true, altAr: true, startsAt: true, endsAt: true },
    }),
    db.storeSetting.findUnique({
      where: { id: "default" },
      select: { announcementEnabled: true, announcementText: true, announcementTextAr: true, announcementCtaLabel: true, announcementCtaLabelAr: true, announcementCtaUrl: true, announcementStartsAt: true, announcementEndsAt: true },
    }),
  ]);

  const announcement = setting?.announcementEnabled && isScheduledContentActive({ startsAt: setting.announcementStartsAt, endsAt: setting.announcementEndsAt }, now)
    ? setting
    : null;
  return { banners: assets.filter((asset) => isScheduledContentActive(asset, now)), announcement };
}
