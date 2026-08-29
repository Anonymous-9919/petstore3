import { z } from "zod";

const nullableDate = z.string().trim().datetime({ offset: true }).nullable().optional().transform((value) => value == null ? null : new Date(value));
const nullableLimit = z.coerce.number().int().min(1).max(100000000).nullable().optional();
const nullableMoney = z.coerce.number().finite().min(0).max(999999999).nullable().optional();
const uniqueIds = z.array(z.string().uuid()).max(100).refine((ids) => new Set(ids).size === ids.length, "IDs must be unique.");

export const promotionInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  nameAr: z.string().trim().min(1).max(200),
  code: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/, "Code may only contain letters, numbers, hyphens, and underscores.").nullable().optional().transform((value) => value ? value.toUpperCase() : null),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  scope: z.enum(["PRODUCT", "CATEGORY", "CART"]),
  value: z.coerce.number().finite().positive().max(999999999),
  benefit: z.enum(["DISCOUNT", "FREE_DELIVERY", "BUY_X_GET_Y", "QUANTITY_TIER", "FREE_ITEM"]).default("DISCOUNT"),
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "EXPIRED", "DISABLED"]).default("ACTIVE"),
  minimumQuantity: z.coerce.number().int().min(1).max(1000000).nullable().optional(),
  firstOrderOnly: z.boolean().default(false),
  maxDiscount: nullableMoney,
  priority: z.coerce.number().int().min(-1000000).max(1000000).default(0),
  isStackable: z.boolean().default(false),
  minimumCartValue: z.coerce.number().finite().min(0).max(999999999).nullable().optional(),
  usageLimit: nullableLimit,
  perCustomerLimit: nullableLimit,
  startsAt: nullableDate,
  endsAt: nullableDate,
  isActive: z.boolean().default(true),
  targetIds: uniqueIds.default([]),
  branchIds: uniqueIds.default([]),
  areaIds: uniqueIds.default([]),
  qualifyingProductIds: uniqueIds.default([]),
  rewardProductIds: uniqueIds.default([]),
  rewardQuantity: z.coerce.number().int().min(1).max(1_000).default(1),
}).superRefine((value, context) => {
  if (value.type === "PERCENTAGE" && value.value > 100) context.addIssue({ code: "custom", path: ["value"], message: "Percentage discounts cannot exceed 100%." });
  if (value.endsAt && value.startsAt && value.endsAt <= value.startsAt) context.addIssue({ code: "custom", path: ["endsAt"], message: "End date must be after the start date." });
  if (value.scope !== "CART" && value.targetIds.length === 0 && !["BUY_X_GET_Y", "FREE_ITEM"].includes(value.benefit)) context.addIssue({ code: "custom", path: ["targetIds"], message: "Select at least one target for this promotion scope." });
  if (value.scope === "CART" && value.targetIds.length > 0) context.addIssue({ code: "custom", path: ["targetIds"], message: "Cart promotions cannot have product or category targets." });
  if (value.benefit === "FREE_DELIVERY" && value.scope !== "CART") context.addIssue({ code: "custom", path: ["scope"], message: "Free delivery promotions apply to the cart." });
  if (value.benefit === "FREE_DELIVERY" && value.maxDiscount != null) context.addIssue({ code: "custom", path: ["maxDiscount"], message: "Free delivery cannot have a discount cap." });
  if (value.minimumQuantity && value.scope === "CART") context.addIssue({ code: "custom", path: ["minimumQuantity"], message: "Quantity conditions require product or category scope." });
  if (value.status === "SCHEDULED" && !value.startsAt) context.addIssue({ code: "custom", path: ["startsAt"], message: "Scheduled promotions require a start date." });
  const productRewardBenefit = ["BUY_X_GET_Y", "FREE_ITEM"].includes(value.benefit);
  if (productRewardBenefit && value.scope !== "PRODUCT") context.addIssue({ code: "custom", path: ["scope"], message: "Product reward promotions require product scope." });
  if (productRewardBenefit && value.qualifyingProductIds.length === 0) context.addIssue({ code: "custom", path: ["qualifyingProductIds"], message: "Select at least one qualifying product." });
  if (productRewardBenefit && value.rewardProductIds.length === 0) context.addIssue({ code: "custom", path: ["rewardProductIds"], message: "Select at least one reward product." });
  if (productRewardBenefit && value.targetIds.length > 0) context.addIssue({ code: "custom", path: ["targetIds"], message: "Use qualifying product IDs for product reward promotions." });
  if (value.benefit === "QUANTITY_TIER" && (value.scope !== "PRODUCT" || value.targetIds.length === 0 || !value.minimumQuantity)) context.addIssue({ code: "custom", path: ["minimumQuantity"], message: "Quantity tiers require product targets and a minimum quantity." });
  if (productRewardBenefit && value.type !== "FIXED") context.addIssue({ code: "custom", path: ["type"], message: "Product reward promotions use fixed pricing internally." });
});
