import { z } from "zod";
import { nullableDateTime, nullableStorefrontUrl } from "@/server/validation/storefront-content";

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional().transform((value) => value || null);
const optionalNullableDateTime = nullableDateTime.optional().transform((value) => value ?? null);

export const popupInputSchema = z.object({
  name: z.string().trim().min(1).max(120), title: z.string().trim().min(1).max(200), titleAr: z.string().trim().min(1).max(200),
  body: nullableText(1000), bodyAr: nullableText(1000), imagePath: nullableStorefrontUrl, ctaLabel: nullableText(100), ctaLabelAr: nullableText(100),
  ctaUrl: nullableStorefrontUrl, couponCode: nullableText(100).transform((value) => value?.toUpperCase() ?? null), status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  isEnabled: z.boolean().default(true), pageTarget: z.enum(["ALL", "HOME", "CATEGORY", "PRODUCT", "CART"]).default("ALL"), delaySeconds: z.coerce.number().int().min(0).max(3600).default(0),
  trigger: z.enum(["DELAY", "SCROLL", "EXIT_INTENT"]).default("DELAY"), scrollPercentage: z.coerce.number().int().min(1).max(100).nullable().optional(),
  device: z.enum(["ALL", "DESKTOP", "MOBILE"]).default("ALL"), frequency: z.enum(["EVERY_VISIT", "ONCE_PER_SESSION", "ONCE_PER_DAY", "ONCE_PER_X_DAYS"]).default("ONCE_PER_SESSION"), frequencyDays: z.coerce.number().int().min(1).max(365).nullable().optional(), startsAt: optionalNullableDateTime, endsAt: optionalNullableDateTime,
}).superRefine((value, context) => {
  if ((value.ctaLabel || value.ctaLabelAr) && !value.ctaUrl && !value.couponCode) context.addIssue({ code: "custom", path: ["ctaUrl"], message: "A CTA needs a URL or coupon code." });
  if (value.endsAt && value.startsAt && value.endsAt <= value.startsAt) context.addIssue({ code: "custom", path: ["endsAt"], message: "End date must be after start date." });
  if (value.trigger === "SCROLL" && !value.scrollPercentage) context.addIssue({ code: "custom", path: ["scrollPercentage"], message: "Scroll-triggered popups require a scroll percentage." });
  if (value.trigger !== "SCROLL" && value.scrollPercentage != null) context.addIssue({ code: "custom", path: ["scrollPercentage"], message: "Only scroll-triggered popups can have a scroll percentage." });
  if (value.frequency === "ONCE_PER_X_DAYS" && !value.frequencyDays) context.addIssue({ code: "custom", path: ["frequencyDays"], message: "This frequency requires a number of days." });
  if (value.frequency !== "ONCE_PER_X_DAYS" && value.frequencyDays != null) context.addIssue({ code: "custom", path: ["frequencyDays"], message: "Only recurring popups can have a frequency interval." });
});

export const popupEventSchema = z.object({ popupId: z.string().uuid(), type: z.enum(["IMPRESSION", "CLICK"]), pageTarget: z.enum(["ALL", "HOME", "CATEGORY", "PRODUCT", "CART"]), device: z.enum(["DESKTOP", "MOBILE"]) });
