import { describe, expect, it } from "vitest";
import { popupInputSchema } from "@/server/validation/popup";

const valid = { name: "Summer", title: "Summer sale", titleAr: "تخفيضات الصيف", body: null, bodyAr: null, imagePath: null, ctaLabel: null, ctaLabelAr: null, ctaUrl: null, couponCode: null };
describe("popupInputSchema", () => {
  it("accepts a bilingual popup and normalizes its coupon", () => expect(popupInputSchema.parse({ ...valid, couponCode: " save10 " }).couponCode).toBe("SAVE10"));
  it("requires a destination or coupon when a CTA label is supplied", () => expect(popupInputSchema.safeParse({ ...valid, ctaLabel: "Shop" }).success).toBe(false));
  it("rejects executable CTA URL schemes", () => expect(popupInputSchema.safeParse({ ...valid, ctaUrl: "javascript:alert(1)" }).success).toBe(false));
  it("rejects protocol-relative and credentialed CTA URLs", () => {
    expect(popupInputSchema.safeParse({ ...valid, ctaUrl: "//example.com/sale" }).success).toBe(false);
    expect(popupInputSchema.safeParse({ ...valid, ctaUrl: "https://user@example.com/sale" }).success).toBe(false);
  });
  it("accepts site-relative and HTTPS CTA URLs", () => {
    expect(popupInputSchema.safeParse({ ...valid, ctaUrl: "/category/dogs" }).success).toBe(true);
    expect(popupInputSchema.safeParse({ ...valid, ctaUrl: "https://example.com/sale" }).success).toBe(true);
  });
  it("rejects an invalid schedule", () => expect(popupInputSchema.safeParse({ ...valid, startsAt: "2026-08-26T12:00:00.000Z", endsAt: "2026-08-25T12:00:00.000Z" }).success).toBe(false));
  it("rejects trigger and recurrence settings that cannot be consumed", () => {
    expect(popupInputSchema.safeParse({ ...valid, trigger: "DELAY", scrollPercentage: 50 }).success).toBe(false);
    expect(popupInputSchema.safeParse({ ...valid, frequency: "ONCE_PER_DAY", frequencyDays: 2 }).success).toBe(false);
  });
});
