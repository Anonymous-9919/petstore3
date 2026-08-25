import { describe, expect, it } from "vitest";
import { checkoutRequestSchema } from "@/server/validation/checkout";

const validCheckout = {
  items: [{ productId: 10, quantity: 2, optionValueIds: [4] }],
  mode: "delivery",
  branchId: 3,
  areaId: 8,
  paymentMethod: "cash",
  contact: { name: "Aisha Ali", phone: "+96512345678", email: "aisha@example.com" },
  address: { type: "home", block: "4", street: "Main Street", building: "12" },
};

describe("checkoutRequestSchema", () => {
  it("accepts a bounded, valid checkout request and defaults omitted options", () => {
    const result = checkoutRequestSchema.parse({ ...validCheckout, items: [{ productId: 10, quantity: 2 }] });

    expect(result.items[0].optionValueIds).toEqual([]);
    expect(result.contact.name).toBe("Aisha Ali");
    expect(result.contact.phone).toBe("+96512345678");
  });

  it("accepts an optional public variant ID without invalidating legacy carts", () => {
    expect(checkoutRequestSchema.parse({ ...validCheckout, items: [{ productId: 10, variantId: 42, quantity: 1 }] }).items[0].variantId).toBe(42);
    expect(checkoutRequestSchema.safeParse({ ...validCheckout, items: [{ productId: 10, variantId: 0, quantity: 1 }] }).success).toBe(false);
  });

  it("canonicalizes supported local and international Kuwait phone representations", () => {
    expect(checkoutRequestSchema.parse({ ...validCheckout, contact: { ...validCheckout.contact, phone: "00965 5123-4567" } }).contact.phone).toBe("+96551234567");
    expect(checkoutRequestSchema.parse({ ...validCheckout, contact: { ...validCheckout.contact, phone: "51234567" } }).contact.phone).toBe("+96551234567");
  });

  it("rejects malformed items, payment methods, and Kuwait phone numbers", () => {
    const result = checkoutRequestSchema.safeParse({
      ...validCheckout,
      items: [{ productId: 0, quantity: 101, optionValueIds: [0] }],
      paymentMethod: "card",
      contact: { ...validCheckout.contact, phone: "555-1234" },
    });

    expect(result.success).toBe(false);
  });

  it("rejects oversized free-text fields before checkout reaches the service", () => {
    expect(checkoutRequestSchema.safeParse({ ...validCheckout, customerNote: "x".repeat(1001) }).success).toBe(false);
  });

  it("normalizes promotion codes and rejects unsafe values", () => {
    expect(checkoutRequestSchema.parse({ ...validCheckout, promotionCode: " save_10 " }).promotionCode).toBe("SAVE_10");
    expect(checkoutRequestSchema.safeParse({ ...validCheckout, promotionCode: "SAVE 10" }).success).toBe(false);
  });
});
