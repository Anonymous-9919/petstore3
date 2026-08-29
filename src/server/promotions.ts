import "server-only";

export const promotionTemplates = [
  { id: "percentage-discount", name: "Percentage Discount", description: "A percentage off the cart, selected products, or categories.", defaults: { type: "PERCENTAGE", scope: "CART", value: 10, benefit: "DISCOUNT" } },
  { id: "fixed-discount", name: "Fixed Amount Discount", description: "A fixed KWD discount on the cart or selected items.", defaults: { type: "FIXED", scope: "CART", value: 5, benefit: "DISCOUNT" } },
  { id: "product-sale", name: "Product Sale", description: "Discount selected products.", defaults: { type: "PERCENTAGE", scope: "PRODUCT", value: 10, benefit: "DISCOUNT" } },
  { id: "category-sale", name: "Category Sale", description: "Discount all products in selected categories.", defaults: { type: "PERCENTAGE", scope: "CATEGORY", value: 10, benefit: "DISCOUNT" } },
  { id: "minimum-spend", name: "Minimum Spend Discount", description: "Discount carts that meet a minimum spend.", defaults: { type: "FIXED", scope: "CART", value: 5, benefit: "DISCOUNT", minimumCartValue: 25 } },
  { id: "buy-x-get-y", name: "Buy X Get Y", description: "Make configured reward products free after a qualifying purchase.", defaults: { type: "FIXED", scope: "PRODUCT", value: 1, benefit: "BUY_X_GET_Y", minimumQuantity: 2, rewardQuantity: 1 } },
  { id: "free-delivery", name: "Free Delivery", description: "Waive delivery fees, optionally for selected branches or areas.", defaults: { type: "FIXED", scope: "CART", value: 1, benefit: "FREE_DELIVERY" } },
  { id: "first-order", name: "First Order Discount", description: "Welcome discount available only on a customer's first order.", defaults: { type: "PERCENTAGE", scope: "CART", value: 10, benefit: "DISCOUNT", firstOrderOnly: true } },
  { id: "quantity-discount", name: "Quantity Discount", description: "Discount selected products when each line reaches the required quantity.", defaults: { type: "PERCENTAGE", scope: "PRODUCT", value: 10, benefit: "QUANTITY_TIER", minimumQuantity: 2 } },
  { id: "flash-sale", name: "Flash Sale", description: "A scheduled product or category discount.", defaults: { type: "PERCENTAGE", scope: "PRODUCT", value: 15, benefit: "DISCOUNT", status: "SCHEDULED" } },
] as const;

type SchedulablePromotion = {
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "EXPIRED" | "DISABLED";
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

// Persist the lifecycle state implied by dates so admin lists match checkout eligibility.
export function normalizePromotionSchedule<T extends SchedulablePromotion>(promotion: T, now = new Date()): T {
  if (promotion.status === "DRAFT" || promotion.status === "DISABLED") return promotion;
  if (promotion.endsAt && promotion.endsAt <= now) return { ...promotion, status: "EXPIRED", isActive: false };
  if (promotion.startsAt && promotion.startsAt > now) return { ...promotion, status: "SCHEDULED", isActive: true };
  return promotion.status === "SCHEDULED" ? { ...promotion, status: "ACTIVE", isActive: true } : promotion;
}
