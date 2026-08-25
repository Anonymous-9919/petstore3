import { describe, expect, it } from "vitest";
import { popupInputSchema } from "@/server/validation/popup";

const valid = { name: "Summer", title: "Summer sale", titleAr: "تخفيضات الصيف", body: null, bodyAr: null, imagePath: null, ctaLabel: null, ctaLabelAr: null, ctaUrl: null, couponCode: null };
describe("popupInputSchema", () => {
  it("accepts a bilingual popup and normalizes its coupon", () => expect(popupInputSchema.parse({ ...valid, couponCode: " save10 " }).couponCode).toBe("SAVE10"));
  it("requires a destination or coupon when a CTA label is supplied", () => expect(popupInputSchema.safeParse({ ...valid, ctaLabel: "Shop" }).success).toBe(false));
  it("rejects an invalid schedule", () => expect(popupInputSchema.safeParse({ ...valid, startsAt: "2026-08-26T12:00:00.000Z", endsAt: "2026-08-25T12:00:00.000Z" }).success).toBe(false));
});
