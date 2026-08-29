import { describe, expect, it } from "vitest";
import { normalizePromotionSchedule, promotionTemplates } from "@/server/promotions";

const now = new Date("2026-08-29T12:00:00.000Z");
const base = { status: "ACTIVE" as const, isActive: true, startsAt: null, endsAt: null };

describe("promotion schedule normalization", () => {
  it("persists future and elapsed schedules as scheduled and expired", () => {
    expect(normalizePromotionSchedule({ ...base, startsAt: new Date("2026-08-30T12:00:00.000Z") }, now)).toMatchObject({ status: "SCHEDULED", isActive: true });
    expect(normalizePromotionSchedule({ ...base, endsAt: new Date("2026-08-29T11:59:59.000Z") }, now)).toMatchObject({ status: "EXPIRED", isActive: false });
  });

  it("activates elapsed scheduled promotions without overriding drafts or disabled promotions", () => {
    expect(normalizePromotionSchedule({ ...base, status: "SCHEDULED" }, now)).toMatchObject({ status: "ACTIVE", isActive: true });
    expect(normalizePromotionSchedule({ ...base, status: "DRAFT", startsAt: new Date("2026-08-30T12:00:00.000Z") }, now)).toMatchObject({ status: "DRAFT" });
    expect(normalizePromotionSchedule({ ...base, status: "DISABLED", startsAt: new Date("2026-08-30T12:00:00.000Z") }, now)).toMatchObject({ status: "DISABLED" });
  });
});

describe("promotion templates", () => {
  it("exposes the supported manager-friendly promotion presets", () => {
    expect(promotionTemplates.map((template) => template.id)).toEqual(expect.arrayContaining(["percentage-discount", "buy-x-get-y", "free-delivery", "flash-sale"]));
  });
});
