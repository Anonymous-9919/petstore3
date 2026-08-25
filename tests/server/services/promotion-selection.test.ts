import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { consumingRedemptionOrderStatuses, selectBestAutomaticPromotion } from "@/server/services/checkout";

describe("automatic promotion selection", () => {
  it("uses the highest eligible discount and keeps creation order for ties", () => {
    const first = { id: "first", discount: new Prisma.Decimal("2.000") };
    const result = selectBestAutomaticPromotion([first, { id: "larger", discount: new Prisma.Decimal("3.000") }, { id: "same", discount: new Prisma.Decimal("3.000") }]);

    expect(result?.id).toBe("larger");
  });

  it("does not count failed or cancelled orders against usage limits", () => {
    expect(consumingRedemptionOrderStatuses).not.toContain("PAYMENT_FAILED");
    expect(consumingRedemptionOrderStatuses).not.toContain("CANCELLED");
  });
});
