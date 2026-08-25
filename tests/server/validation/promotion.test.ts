import { describe, expect, it } from "vitest";
import { promotionInputSchema } from "@/server/validation/promotion";

const targetId = "00000000-0000-4000-8000-000000000001";

describe("promotionInputSchema", () => {
  it("accepts code-less automatic promotions and normalizes supplied codes", () => {
    expect(promotionInputSchema.parse({ name: "Automatic", nameAr: "تلقائي", code: null, type: "PERCENTAGE", scope: "CART", value: 10 }).code).toBeNull();
    expect(promotionInputSchema.parse({ name: "Code", nameAr: "رمز", code: " save_10 ", type: "FIXED", scope: "PRODUCT", value: 1, targetIds: [targetId] }).code).toBe("SAVE_10");
  });

  it("rejects invalid schedules, percentages, and target combinations", () => {
    expect(promotionInputSchema.safeParse({ name: "Bad", nameAr: "سيئ", type: "PERCENTAGE", scope: "CART", value: 101 }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ name: "Bad", nameAr: "سيئ", type: "FIXED", scope: "CART", value: 1, targetIds: [targetId] }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ name: "Bad", nameAr: "سيئ", type: "FIXED", scope: "PRODUCT", value: 1 }).success).toBe(false);
  });

  it("accepts typed advanced conditions and rejects unsafe combinations", () => {
    const promotion = promotionInputSchema.parse({ name: "Welcome delivery", nameAr: "توصيل", type: "FIXED", scope: "CART", value: 1, benefit: "FREE_DELIVERY", status: "ACTIVE", firstOrderOnly: true, priority: 10, isStackable: true, branchIds: [targetId] });
    expect(promotion.benefit).toBe("FREE_DELIVERY");
    expect(promotion.firstOrderOnly).toBe(true);
    expect(promotionInputSchema.safeParse({ name: "Bad", nameAr: "سيئ", type: "FIXED", scope: "PRODUCT", value: 1, benefit: "FREE_DELIVERY", targetIds: [targetId] }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ name: "Bad", nameAr: "سيئ", type: "FIXED", scope: "CART", value: 1, minimumQuantity: 2 }).success).toBe(false);
  });

  it("requires explicit active-product identifiers for product reward benefits", () => {
    const buyXGetY = { name: "Buy food get treat", nameAr: "اشتر طعاما", type: "FIXED", scope: "PRODUCT", value: 1, benefit: "BUY_X_GET_Y" as const, minimumQuantity: 2, qualifyingProductIds: [targetId], rewardProductIds: ["00000000-0000-4000-8000-000000000002"], rewardQuantity: 1 };
    expect(promotionInputSchema.safeParse(buyXGetY).success).toBe(true);
    expect(promotionInputSchema.safeParse({ ...buyXGetY, rewardProductIds: [] }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ ...buyXGetY, type: "PERCENTAGE" }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ ...buyXGetY, benefit: "QUANTITY_TIER", qualifyingProductIds: [], rewardProductIds: [], targetIds: [targetId] }).success).toBe(true);
  });
});
