import { describe, expect, it } from "vitest";
import { productBulkActionSchema, productEditorInputSchema, productInputSchema, productListQuerySchema } from "@/server/validation/catalog";

const product = {
  categoryId: "8d87b7f0-2bb4-4b63-8750-35e5d4221a80",
  slug: "imported-product",
  name: "Imported product",
  nameAr: "منتج مستورد",
  basePrice: 1,
};

describe("product catalog validation", () => {
  it("bounds pagination and only allows known filter and sorting values", () => {
    expect(productListQuerySchema.parse({}).pageSize).toBe(25);
    expect(productListQuerySchema.parse({ page: "3", pageSize: "100", sort: "basePrice", direction: "desc" })).toMatchObject({ page: 3, pageSize: 100, sort: "basePrice", direction: "desc" });
    expect(productListQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ pageSize: "101" }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ sort: "id; DROP TABLE Product" }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ stock: "all OR true" }).success).toBe(false);
  });

  it("accepts imported descriptions that exceed the former 4,000 character limit", () => {
    expect(productInputSchema.safeParse({ ...product, description: "x".repeat(5000) }).success).toBe(true);
    expect(productInputSchema.safeParse({ ...product, description: "x".repeat(50001) }).success).toBe(false);
  });

  it("validates bilingual option groups and safe bulk action payloads", () => {
    expect(productEditorInputSchema.safeParse({ ...product, images: [{ path: "/products/a.jpg", sortOrder: 0 }], optionGroups: [{ name: "Size", nameAr: "الحجم", isRequired: true, minSelections: 1, sortOrder: 0, values: [{ value: "Small", valueAr: "صغير", sortOrder: 0 }] }] }).success).toBe(true);
    expect(productEditorInputSchema.safeParse({ ...product, images: [], optionGroups: [{ name: "Size", nameAr: "الحجم", isRequired: true, minSelections: 0, sortOrder: 0, values: [] }] }).success).toBe(false);
    expect(productBulkActionSchema.safeParse({ action: "category", productIds: [product.categoryId] }).success).toBe(false);
    expect(productBulkActionSchema.safeParse({ action: "price", productIds: [product.categoryId], basePrice: 2, compareAtPrice: 1 }).success).toBe(false);
  });

  it("accepts an additive default variant in the product editor payload", () => {
    expect(productEditorInputSchema.safeParse({ ...product, images: [], optionGroups: [], defaultVariant: { sku: "DOG-001", barcode: "12345", price: 2, cost: 1, weight: 0.5 } }).success).toBe(true);
  });

  it("validates sellable variants and additive catalog metadata", () => {
    expect(productEditorInputSchema.safeParse({ ...product, brand: "Acme", tags: ["Dogs", "dogs"], images: [], optionGroups: [], variants: [{ sku: "DOG-S", name: "Small", nameAr: "صغير", price: 2, compareAtPrice: 3 }] }).data?.tags).toEqual(["dogs"]);
    expect(productEditorInputSchema.safeParse({ ...product, images: [], optionGroups: [], variants: [{ sku: "DOG-S", price: 3, compareAtPrice: 2 }] }).success).toBe(false);
  });
});
