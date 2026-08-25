import { describe, expect, it } from "vitest";
import { isScheduledContentActive } from "@/server/storefront-content";

describe("storefront content scheduling", () => {
  const now = new Date("2026-08-25T12:00:00.000Z");

  it("includes unscheduled and currently scheduled content", () => {
    expect(isScheduledContentActive({ startsAt: null, endsAt: null }, now)).toBe(true);
    expect(isScheduledContentActive({ startsAt: new Date("2026-08-25T11:00:00.000Z"), endsAt: new Date("2026-08-25T13:00:00.000Z") }, now)).toBe(true);
  });

  it("excludes content before it starts and at its end boundary", () => {
    expect(isScheduledContentActive({ startsAt: new Date("2026-08-25T12:00:01.000Z"), endsAt: null }, now)).toBe(false);
    expect(isScheduledContentActive({ startsAt: null, endsAt: now }, now)).toBe(false);
  });
});
