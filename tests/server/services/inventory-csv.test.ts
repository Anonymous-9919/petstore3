import { describe, expect, it } from "vitest";
import { inventoryCsvTemplate, previewInventoryCsv } from "@/server/services/inventory-csv";

const context = {
  branches: [{ id: "11111111-1111-4111-8111-111111111111", name: "Main Store" }],
  products: [{ id: "22222222-2222-4222-8222-222222222222", sku: "DOG-001" }],
  variants: [{ id: "33333333-3333-4333-8333-333333333333", productId: "22222222-2222-4222-8222-222222222222", sku: "DOG-001-L", isDefault: true }],
};

describe("inventory CSV", () => {
  it("provides the documented template and resolves product or variant SKU rows", () => {
    expect(inventoryCsvTemplate).toContain("sku,branch,quantity,mode");
    const preview = previewInventoryCsv("sku,branch,quantity,mode\nDOG-001-L,Main Store,4,Add\n", context);
    expect(preview.errors).toEqual([]);
    expect(preview.rows[0]).toMatchObject({ productId: context.products[0].id, variantId: context.variants[0].id, mode: "ADD", quantity: 4 });
  });

  it("rejects invalid modes and duplicate branch/variant updates", () => {
    const preview = previewInventoryCsv("sku,branch,quantity,mode\nDOG-001,Main Store,4,Move\nDOG-001-L,Main Store,4,Set\n", context);
    expect(preview.errors.map((error) => error.message)).toContain("Mode must be Set, Add, or Subtract.");
    expect(preview.errors.map((error) => error.message)).toContain("Only one row per branch and variant is allowed.");
  });

  it("keeps separate variants at the same branch independent", () => {
    const preview = previewInventoryCsv("sku,branch,quantity,mode\nDOG-001-L,Main Store,4,Set\nDOG-001-XL,Main Store,7,Set\n", {
      ...context,
      variants: [...context.variants, { id: "44444444-4444-4444-8444-444444444444", productId: context.products[0].id, sku: "DOG-001-XL" }],
    });
    expect(preview.errors).toEqual([]);
    expect(preview.rows.map((row) => row.variantId)).toEqual([context.variants[0].id, "44444444-4444-4444-8444-444444444444"]);
  });
});
