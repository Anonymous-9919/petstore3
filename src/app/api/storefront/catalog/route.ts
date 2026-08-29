import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { unstable_cache } from "next/cache";
import { storefrontCatalogTag } from "@/server/catalog-cache";
import { categoryList, getProducts } from "@/data/loader";

export const runtime = "nodejs";

const getCatalog = unstable_cache(async () => {
  const [categories, products] = await Promise.all([
    db.category.findMany({ where: { isActive: true, archivedAt: null }, orderBy: { sortOrder: "asc" } }),
    db.product.findMany({
      where: { isActive: true, archivedAt: null, category: { isActive: true, archivedAt: null } },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
       include: {
         category: true,
         images: { orderBy: { sortOrder: "asc" } },
          inventoryLevels: { select: { quantity: true, reserved: true } },
          variants: { where: { isActive: true }, orderBy: { publicId: "asc" }, select: { publicId: true, sku: true, barcode: true, name: true, nameAr: true, price: true, compareAtPrice: true, isDefault: true } },
         optionGroups: { orderBy: { sortOrder: "asc" }, include: { values: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } } },
       },
    }),
  ]);
  return {
    categories: categories.map((category) => ({ id: category.legacyId ?? category.publicId, public_id: category.publicId, name: category.name, ar_name: category.nameAr, slug: category.slug, photo: category.imagePath ?? "", cover_photo: null, cover_photo_large: null, order: category.sortOrder, description: category.description ?? "", ar_description: category.descriptionAr ?? "" })),
     products: products.map((product) => {
       const available = product.inventoryLevels.some((level) => level.quantity > level.reserved);
       const gallery = product.images.map((image) => image.path);
       return ({
       id: product.legacyId ?? product.publicId,
       public_id: product.publicId,
      name: product.name,
      ar_name: product.nameAr,
      description: product.description ?? "",
      ar_description: product.descriptionAr ?? "",
      short_description: product.shortDescription ?? "",
      ar_short_description: product.shortDescriptionAr ?? "",
       price: Number(product.basePrice),
      striked_price: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      currency: product.currencyCode === "KWD" ? "KD" : product.currencyCode,
      slug: product.slug,
      photo: product.primaryImagePath ?? "",
      photo_thumb: product.primaryImagePath ?? "",
      photo_small: product.primaryImagePath ?? "",
      photo_medium: product.primaryImagePath ?? "",
       gallery,
      allow_special_remarks: true,
      hide_quantity_box: false,
      hide_buy_button: false,
      enable_buy_now: true,
       not_available: !product.allowPreorder && !available,
      show_quick_add_to_cart: true,
      allow_preordering: product.allowPreorder,
      min_addable_quantity: product.minQuantity,
      max_addable_quantity: product.maxQuantity,
       category_id: product.category.legacyId ?? product.category.publicId,
      category_slug: product.category.slug,
      published_date: null,
        options_groups: product.optionGroups.map((group) => ({ id: group.legacyId ?? group.publicId, public_id: group.publicId, required: group.isRequired, multiple: group.allowsMultiple, min_selections: group.minSelections, max_selections: group.maxSelections })),
       options: product.optionGroups.map((group) => ({
        id: group.legacyId ?? group.publicId,
        public_id: group.publicId,
        name: group.name,
        ar_name: group.nameAr,
        choices: group.values.map((value) => ({ id: value.legacyId ?? value.publicId, public_id: value.publicId, value: value.value, ar_value: value.valueAr, price: Number(value.priceDelta), striked_price: value.compareAtDelta ? Number(value.compareAtDelta) : 0, photo: value.imagePath, photo_thumb: value.imagePath, preselected: 0, sort_order: value.sortOrder })),
        })),
       // Additive only: existing clients keep using the legacy product price and ID.
       variants: product.variants.map((variant) => ({ id: variant.publicId, sku: variant.sku, barcode: variant.barcode, name: variant.name, ar_name: variant.nameAr, price: Number(variant.price), striked_price: variant.compareAtPrice ? Number(variant.compareAtPrice) : null, is_default: variant.isDefault })),
       });
     }),
  };
}, ["storefront-catalog"], { tags: [storefrontCatalogTag] });

export async function GET() {
  if (process.env.E2E_STATIC_FIXTURES === "1") {
    return NextResponse.json({ categories: categoryList, products: await getProducts() }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(await getCatalog(), { headers: { "Cache-Control": "no-store" } });
}
