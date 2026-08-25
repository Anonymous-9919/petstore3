import { Prisma } from "@prisma/client";

const decimal = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value);

export type PromotionCalculation = {
  type: "PERCENTAGE" | "FIXED";
  benefit?: "DISCOUNT" | "FREE_DELIVERY" | "BUY_X_GET_Y" | "QUANTITY_TIER" | "FREE_ITEM";
  scope: "PRODUCT" | "CATEGORY" | "CART";
  value: Prisma.Decimal;
  minimumQuantity?: number | null;
  maxDiscount?: Prisma.Decimal | null;
  targets: Array<{ productId: string | null; categoryId: string | null }>;
  qualifyingProductIds?: string[];
  rewardProductIds?: string[];
  rewardQuantity?: number;
};

export type PromotionLine = { product: { id: string; categoryId: string }; quantity?: number; lineTotal: Prisma.Decimal };

export function calculatePromotionDiscount(promotion: PromotionCalculation, lines: PromotionLine[]) {
  if (promotion.benefit === "BUY_X_GET_Y" || promotion.benefit === "FREE_ITEM") {
    const qualifyingIds = promotion.qualifyingProductIds ?? [];
    const rewardIds = promotion.rewardProductIds ?? [];
    const qualifyingQuantity = lines.filter((line) => qualifyingIds.includes(line.product.id)).reduce((total, line) => total + (line.quantity ?? 1), 0);
    const requiredQuantity = promotion.minimumQuantity ?? 1;
    const rewardQuantity = promotion.rewardQuantity ?? 1;
    const rewardLines = lines.filter((line) => rewardIds.includes(line.product.id));
    if (!qualifyingQuantity || rewardLines.length === 0) throw new Error("This promotion requires qualifying and reward products in the cart.");
    // If an item qualifies for and receives the reward, reserve the purchased quantity first.
    const overlappingQuantity = lines.filter((line) => qualifyingIds.includes(line.product.id) && rewardIds.includes(line.product.id)).reduce((total, line) => total + (line.quantity ?? 1), 0);
    const sets = promotion.benefit === "BUY_X_GET_Y" && overlappingQuantity
      ? Math.floor(overlappingQuantity / (requiredQuantity + rewardQuantity))
      : promotion.benefit === "BUY_X_GET_Y" ? Math.floor(qualifyingQuantity / requiredQuantity) : 1;
    const freeUnits = sets * rewardQuantity;
    if (!freeUnits) throw new Error("This promotion requires a higher qualifying quantity.");
    let remaining = freeUnits;
    let discount = decimal(0);
    for (const line of rewardLines) {
      if (!remaining) break;
      const quantity = line.quantity ?? 1;
      const freeOnLine = Math.min(quantity, remaining);
      discount = discount.plus(line.lineTotal.div(quantity).mul(freeOnLine));
      remaining -= freeOnLine;
    }
    if (remaining) throw new Error("Add the configured reward product to the cart to use this promotion.");
    return { discount, eligibleSubtotal: discount };
  }
  const applicableLines = promotion.scope === "CART"
    ? lines
    : lines.filter((line) => promotion.scope === "PRODUCT"
      ? promotion.targets.some((target) => target.productId === line.product.id)
      : promotion.targets.some((target) => target.categoryId === line.product.categoryId));
  const eligibleLines = promotion.minimumQuantity ? applicableLines.filter((line) => (line.quantity ?? 1) >= promotion.minimumQuantity!) : applicableLines;
  const eligibleSubtotal = eligibleLines.reduce((total, line) => total.plus(line.lineTotal), decimal(0));
  if (eligibleSubtotal.isZero()) throw new Error("This promotion does not apply to the cart.");
  const rawDiscount = promotion.type === "PERCENTAGE"
    ? eligibleSubtotal.mul(promotion.value).div(100)
    : Prisma.Decimal.min(eligibleSubtotal, promotion.value);
  const discount = promotion.maxDiscount ? Prisma.Decimal.min(rawDiscount, promotion.maxDiscount) : rawDiscount;
  return { discount, eligibleSubtotal };
}
