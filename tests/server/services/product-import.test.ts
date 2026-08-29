import { describe, expect, it } from "vitest";
import { branchColumn, errorsCsv, isApprovedMediaPath, parseCsv, previewImport, resolveMapping, templateCsv } from "@/server/services/product-import";

const base = "slug,sku,category_slug,name,name_ar,base_price\ndog-food,FOOD-1,dogs,Dog food,طعام الكلاب,4.500\n";
const context = { categories: [{ id: "11111111-1111-4111-8111-111111111111", slug: "dogs" }], branches: [{ id: "22222222-2222-4222-8222-222222222222", name: "Main Store" }], products: [] };

describe("product CSV import", () => {
  it("parses escaped CSV fields and generates branch inventory template columns", () => {
    expect(parseCsv('slug,name\na,"Dog, food"\n').rows).toEqual([["a", "Dog, food"]]);
    expect(branchColumn("Main Store")).toBe("inventory_main-store");
    expect(templateCsv(context.branches)).toContain("inventory_main-store");
  });

  it("previews a valid create with per-branch inventory", () => {
    const preview = previewImport({ csv: base.replace("\n", ",inventory_main-store\n").replace("4.500\n", "4.500,8\n"), ...context });
    expect(preview.errors).toEqual([]);
    expect(preview.summary).toMatchObject({ total: 1, valid: 1, creates: 1 });
    expect(preview.rows[0].inventory).toEqual([{ branchId: "22222222-2222-4222-8222-222222222222", quantity: 8 }]);
  });

  it("maps variant commercial fields while retaining legacy product pricing", () => {
    const csv = "slug,sku,barcode,cost,weight,category_slug,name,name_ar,base_price\ndog-food,FOOD-1,12345,2.1,0.5,dogs,Dog food,طعام الكلاب,4.500\n";
    const preview = previewImport({ csv, ...context });
    expect(preview.errors).toEqual([]);
    expect(preview.rows[0].variant).toMatchObject({ sku: "FOOD-1", barcode: "12345", cost: 2.1, weight: 0.5, price: 4.5 });
  });

  it("groups modern handle rows and resolves variants by SKU or public ID", () => {
    const csv = "handle,variant_sku,category_slug,name,name_ar,base_price\ndog-food,FOOD-S,dogs,Dog food,طعام الكلاب,4.500\n";
    const preview = previewImport({ csv, ...context, variants: [] });
    expect(preview.errors).toEqual([]);
    expect(preview.rows[0]).toMatchObject({ variant: { sku: "FOOD-S" }, variantPublicId: null });
    expect(preview.summary).toMatchObject({ creates: 1 });
  });

  it("rejects a variant identity belonging to another handle", () => {
    const csv = "handle,variant_public_id,category_slug,name,name_ar,base_price\ndog-food,7,dogs,Dog food,طعام الكلاب,4.500\n";
    const preview = previewImport({ csv, ...context, products: [{ id: "product-2", slug: "dog-food", sku: null }], variants: [{ id: "variant-1", publicId: 7, productId: "product-1", sku: "FOOD-S" }] });
    expect(preview.errors).toContainEqual(expect.objectContaining({ field: "variant_sku", message: "Handle and variant identity identify different products." }));
  });

  it("rejects conflicting existing slug and SKU identities and reports CSV errors", () => {
    const preview = previewImport({ csv: base, ...context, products: [{ id: "a", slug: "dog-food", sku: "OTHER" }, { id: "b", slug: "other", sku: "FOOD-1" }] });
    expect(preview.errors.some((error) => error.message.includes("different existing products"))).toBe(true);
    expect(errorsCsv(preview.errors)).toContain('"Slug and SKU identify different existing products."');
  });

  it("maps common export headings and supports explicit import modes", () => {
    expect(resolveMapping(["Product Handle", "Variant SKU", "Category", "Product Name", "Product Name Ar", "Price"])).toMatchObject({ handle: "Product Handle", variant_sku: "Variant SKU", category_slug: "Category", name: "Product Name", name_ar: "Product Name Ar", base_price: "Price" });
    const preview = previewImport({ csv: base, mode: "update", ...context });
    expect(preview.errors).toContainEqual(expect.objectContaining({ message: "Update mode requires an existing variant SKU or public ID." }));
  });

  it("supports bilingual template aliases, tags, SEO, and multiple HTTPS image URLs", () => {
    const csv = "handle,variant_sku,category_slug,title_en,title_ar,price_kwd,tags,seo_title,seo_title_ar,seo_description,seo_description_ar,image_urls\ndog-food,FOOD-S,dogs,Dog food,طعام الكلاب,4.500,dog; food,Dog food SEO,طعام الكلاب SEO,English SEO,Arabic SEO,https://example.test/one.jpg; https://example.test/two.jpg\n";
    const preview = previewImport({ csv, ...context, variants: [] });
    expect(preview.errors).toEqual([]);
    expect(preview.rows[0].product).toMatchObject({ name: "Dog food", nameAr: "طعام الكلاب", tags: ["dog", "food"], seoTitle: "Dog food SEO" });
    expect(preview.rows[0].imageUrls).toEqual(["https://example.test/one.jpg", "https://example.test/two.jpg"]);
  });

  it("only accepts image paths issued by the media upload architecture", () => {
    expect(isApprovedMediaPath("uploads/2026-08-25/123e4567-e89b-42d3-a456-426614174000.webp")).toBe(true);
    expect(isApprovedMediaPath("https://example.test/product.jpg")).toBe(false);
  });
});
