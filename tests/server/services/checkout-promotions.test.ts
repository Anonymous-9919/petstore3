import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculatePromotionDiscount } from "@/server/services/promotion-calculation";

const decimal = (value: number) => new Prisma.Decimal(value);
const lines = [
  { product: { id: "product-a", categoryId: "category-a" }, lineTotal: decimal(10) },
  { product: { id: "product-b", categoryId: "category-b" }, lineTotal: decimal(5) },
];

describe("calculatePromotionDiscount", () => {
  it("only discounts matching product lines and caps fixed discounts", () => {
    const result = calculatePromotionDiscount({ type: "FIXED", scope: "PRODUCT", value: decimal(20), targets: [{ productId: "product-b", categoryId: null }] }, lines);
    expect(result.discount.toString()).toBe("5");
  });

  it("calculates cart percentage discounts from the server-priced subtotal", () => {
    const result = calculatePromotionDiscount({ type: "PERCENTAGE", scope: "CART", value: decimal(10), targets: [] }, lines);
    expect(result.discount.toString()).toBe("1.5");
  });

  it("rejects a scoped promotion with no eligible items", () => {
    expect(() => calculatePromotionDiscount({ type: "PERCENTAGE", scope: "CATEGORY", value: decimal(10), targets: [{ productId: null, categoryId: "category-c" }] }, lines)).toThrow("does not apply");
  });

  it("requires the configured quantity and caps percentage savings", () => {
    const result = calculatePromotionDiscount({ type: "PERCENTAGE", scope: "PRODUCT", value: decimal(50), minimumQuantity: 2, maxDiscount: decimal(3), targets: [{ productId: "product-a", categoryId: null }] }, [{ ...lines[0], quantity: 2 }]);
    expect(result.discount.toString()).toBe("3");
  });

  it("only discounts configured reward items already present in a buy-x-get-y cart", () => {
    const result = calculatePromotionDiscount({ type: "FIXED", benefit: "BUY_X_GET_Y", scope: "PRODUCT", value: decimal(1), minimumQuantity: 2, rewardQuantity: 1, qualifyingProductIds: ["product-a"], rewardProductIds: ["product-b"], targets: [] }, [{ ...lines[0], quantity: 2 }, { ...lines[1], quantity: 1 }]);
    expect(result.discount.toString()).toBe("5");
    expect(() => calculatePromotionDiscount({ type: "FIXED", benefit: "BUY_X_GET_Y", scope: "PRODUCT", value: decimal(1), minimumQuantity: 2, qualifyingProductIds: ["product-a"], rewardProductIds: ["product-b"], targets: [] }, [{ ...lines[0], quantity: 2 }])).toThrow("reward products");
  });

  it("does not treat the qualifying units as free when buy-x-get-y targets the same product", () => {
    const result = calculatePromotionDiscount({ type: "FIXED", benefit: "BUY_X_GET_Y", scope: "PRODUCT", value: decimal(1), minimumQuantity: 2, rewardQuantity: 1, qualifyingProductIds: ["product-a"], rewardProductIds: ["product-a"], targets: [] }, [{ ...lines[0], quantity: 3 }]);
    expect(result.discount.toFixed(3)).toBe("3.333");
  });

  it("counts non-overlapping qualifying products when the reward also qualifies", () => {
    const result = calculatePromotionDiscount({ type: "FIXED", benefit: "BUY_X_GET_Y", scope: "PRODUCT", value: decimal(1), minimumQuantity: 2, rewardQuantity: 1, qualifyingProductIds: ["product-a", "product-b"], rewardProductIds: ["product-b"], targets: [] }, [{ ...lines[0], quantity: 2 }, { ...lines[1], quantity: 1 }]);
    expect(result.discount.toString()).toBe("5");
  });
});
