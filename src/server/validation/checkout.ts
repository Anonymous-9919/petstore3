import { z } from "zod";
import { canonicalizeKuwaitPhone } from "@/lib/phone";

export const checkoutItemSchema = z.object({
  productId: z.number().int().positive(),
  // Optional so carts persisted before Phase 3 continue to select the default variant.
  variantId: z.number().int().positive().optional(),
  quantity: z.number().int().positive().max(100),
  note: z.string().trim().max(500).optional(),
  optionValueIds: z.array(z.number().int().positive()).max(20).default([]),
});

export const checkoutRequestSchema = z.object({
  items: z.array(checkoutItemSchema).min(1).max(100),
  mode: z.enum(["delivery", "pickup"]),
  branchId: z.number().int().positive().nullable(),
  areaId: z.number().int().positive().nullable(),
  paymentMethod: z.enum(["cash", "knet"]),
  contact: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(32).transform((value, context) => {
      const phone = canonicalizeKuwaitPhone(value);
      if (!phone) {
        context.addIssue({ code: "custom", message: "Enter a valid Kuwait phone number." });
        return z.NEVER;
      }
      return phone;
    }),
    email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()).optional(),
  }),
  address: z
    .object({
      type: z.enum(["home", "apartment", "office"]),
      block: z.string().trim().min(1).max(80),
      street: z.string().trim().min(1).max(120),
      building: z.string().trim().min(1).max(120),
      avenue: z.string().trim().max(80).optional(),
      floor: z.string().trim().max(40).optional(),
      apartment: z.string().trim().max(40).optional(),
      paci: z.string().trim().max(80).optional(),
      additional: z.string().trim().max(500).optional(),
    })
    .nullable(),
  scheduledStartAt: z.string().datetime().optional(),
  scheduledEndAt: z.string().datetime().optional(),
  customerNote: z.string().trim().max(1000).optional(),
  promotionCode: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()).optional(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
