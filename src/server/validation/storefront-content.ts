import { z } from "zod";

const hasControlCharacter = /[\u0000-\u001F\u007F]/;

export function isSafeStorefrontUrl(value: string) {
  if (hasControlCharacter.test(value)) return false;
  if (/^\/(?![\\/])/.test(value)) return !value.includes("\\");
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

export const nullableStorefrontUrl = z.string().trim().max(2_000).nullable().transform((value) => value || null).refine((value) => value == null || isSafeStorefrontUrl(value), "URLs must be a site-relative path or an HTTP(S) URL.");
export const nullableDateTime = z.string().trim().datetime({ offset: true }).nullable().transform((value) => value == null ? null : new Date(value));

const nullableText = (max: number) => z.string().trim().max(max).nullable().transform((value) => value || null);

export const announcementInputSchema = z.object({
  enabled: z.boolean(),
  text: nullableText(500),
  textAr: nullableText(500),
  ctaLabel: nullableText(500),
  ctaLabelAr: nullableText(500),
  ctaUrl: nullableStorefrontUrl,
  startsAt: nullableDateTime,
  endsAt: nullableDateTime,
}).superRefine((value, context) => {
  if (value.enabled && !value.text && !value.textAr) context.addIssue({ code: "custom", path: ["text"], message: "Provide English or Arabic announcement text." });
  if ((value.ctaLabel || value.ctaLabelAr) && !value.ctaUrl) context.addIssue({ code: "custom", path: ["ctaUrl"], message: "A CTA label requires a URL." });
  if (value.ctaUrl && !value.ctaLabel && !value.ctaLabelAr) context.addIssue({ code: "custom", path: ["ctaLabel"], message: "A CTA URL requires a label." });
  if (value.startsAt && value.endsAt && value.startsAt >= value.endsAt) context.addIssue({ code: "custom", path: ["endsAt"], message: "End time must be after start time." });
});

export const bannerInputSchema = z.object({
  path: z.string().trim().min(1).max(2_000).refine(isSafeStorefrontUrl, "Banner paths must be a site-relative path or an HTTP(S) URL."),
  mobilePath: nullableStorefrontUrl,
  alt: nullableText(500),
  altAr: nullableText(500),
  sortOrder: z.number().int().min(0).max(10_000),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  placement: z.enum(["HOMEPAGE", "CATEGORY", "HERO"]).default("HOMEPAGE"),
  categoryId: z.string().uuid().nullable().default(null),
  startsAt: nullableDateTime,
  endsAt: nullableDateTime,
}).superRefine((value, context) => {
  if (value.startsAt && value.endsAt && value.startsAt >= value.endsAt) context.addIssue({ code: "custom", path: ["endsAt"], message: "End time must be after start time." });
  if (value.placement === "CATEGORY" && !value.categoryId) context.addIssue({ code: "custom", path: ["categoryId"], message: "Category banners require a category ID." });
  if (value.placement !== "CATEGORY" && value.categoryId) context.addIssue({ code: "custom", path: ["categoryId"], message: "Only category banners can have a category ID." });
});
