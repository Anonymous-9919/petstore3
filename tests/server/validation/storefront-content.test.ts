import { describe, expect, it } from "vitest";
import { announcementInputSchema, bannerInputSchema } from "@/server/validation/storefront-content";

describe("storefront content validation", () => {
  it("allows only safe banner paths", () => {
    const banner = { path: "/media/sale.jpg", mobilePath: null, alt: null, altAr: null, sortOrder: 0, status: "ACTIVE" as const, placement: "HOMEPAGE" as const, categoryId: null, startsAt: null, endsAt: null };
    expect(bannerInputSchema.safeParse(banner).success).toBe(true);
    expect(bannerInputSchema.safeParse({ ...banner, path: "//cdn.example.com/sale.jpg" }).success).toBe(false);
  });

  it("requires an announcement CTA URL and label together", () => {
    const announcement = { enabled: true, text: "Sale", textAr: null, ctaLabel: null, ctaLabelAr: null, ctaUrl: null, startsAt: null, endsAt: null };
    expect(announcementInputSchema.safeParse(announcement).success).toBe(true);
    expect(announcementInputSchema.safeParse({ ...announcement, ctaUrl: "/sale" }).success).toBe(false);
    expect(announcementInputSchema.safeParse({ ...announcement, ctaLabel: "Shop" }).success).toBe(false);
  });

  it("requires offset-aware timestamps", () => {
    const announcement = { enabled: false, text: null, textAr: null, ctaLabel: null, ctaLabelAr: null, ctaUrl: null, startsAt: "2026-08-29T10:00:00", endsAt: null };
    expect(announcementInputSchema.safeParse(announcement).success).toBe(false);
  });
});
