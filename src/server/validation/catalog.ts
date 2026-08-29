import { z } from "zod";

const slug = z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only.");
// Imported catalog descriptions can contain substantial HTML. Keep an abuse bound
// while accepting the legacy records that are already stored in the database.
const optionalText = z.string().trim().max(50000).nullable().optional();
const optionalUrl = z.string().trim().max(2000).nullable().optional();

export const categoryInputSchema = z.object({
  slug,
  name: z.string().trim().min(1).max(200),
  nameAr: z.string().trim().min(1).max(200),
  description: optionalText,
  descriptionAr: optionalText,
  imagePath: optionalUrl,
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
});

const productFields = {
  categoryId: z.string().uuid(),
  slug,
  sku: z.string().trim().min(1).max(100).nullable().optional(),
  name: z.string().trim().min(1).max(200),
  nameAr: z.string().trim().min(1).max(200),
  description: optionalText,
  descriptionAr: optionalText,
  shortDescription: optionalText,
  shortDescriptionAr: optionalText,
  brand: z.string().trim().min(1).max(200).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(30).default([]).transform((tags) => [...new Set(tags.map((tag) => tag.toLowerCase()))]),
  seoTitle: z.string().trim().max(200).nullable().optional(),
  seoTitleAr: z.string().trim().max(200).nullable().optional(),
  seoDescription: z.string().trim().max(500).nullable().optional(),
  seoDescriptionAr: z.string().trim().max(500).nullable().optional(),
  basePrice: z.coerce.number().finite().min(0).max(999999999),
  compareAtPrice: z.coerce.number().finite().min(0).max(999999999).nullable().optional(),
  primaryImagePath: optionalUrl,
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  allowPreorder: z.boolean().default(false),
  isDeliveryEnabled: z.boolean().default(true),
  isPickupEnabled: z.boolean().default(true),
  minQuantity: z.coerce.number().int().min(1).max(10000).default(1),
  maxQuantity: z.coerce.number().int().min(1).max(10000).nullable().optional(),
  quantityIncrement: z.coerce.number().int().min(1).max(10000).default(1),
};

export const productInputSchema = z.object(productFields).refine((value) => value.compareAtPrice == null || value.compareAtPrice >= value.basePrice, { message: "Compare-at price must not be below the base price.", path: ["compareAtPrice"] })
  .refine((value) => value.maxQuantity == null || value.maxQuantity >= value.minQuantity, { message: "Maximum quantity must not be below the minimum quantity.", path: ["maxQuantity"] });

const imageSchema = z.object({
  path: z.string().trim().min(1).max(2000),
  alt: z.string().trim().max(500).nullable().optional(),
  altAr: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000),
});

const optionValueSchema = z.object({
  id: z.string().uuid().optional(),
  value: z.string().trim().min(1).max(200),
  valueAr: z.string().trim().min(1).max(200),
  priceDelta: z.coerce.number().finite().min(-999999999).max(999999999).default(0),
  compareAtDelta: z.coerce.number().finite().min(-999999999).max(999999999).nullable().optional(),
  imagePath: optionalUrl,
  sortOrder: z.coerce.number().int().min(0).max(10000),
  isActive: z.boolean().default(true),
});

export const productVariantInputSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().trim().min(1).max(100).nullable().optional(),
  barcode: z.string().trim().min(1).max(200).nullable().optional(),
  name: z.string().trim().min(1).max(200).nullable().optional(),
  nameAr: z.string().trim().min(1).max(200).nullable().optional(),
  price: z.coerce.number().finite().min(0).max(999999999).optional(),
  compareAtPrice: z.coerce.number().finite().min(0).max(999999999).nullable().optional(),
  cost: z.coerce.number().finite().min(0).max(999999999).nullable().optional(),
  weight: z.coerce.number().finite().min(0).max(999999999).nullable().optional(),
  isActive: z.boolean().optional(),
}).refine((value) => value.compareAtPrice == null || value.price == null || value.compareAtPrice >= value.price, { message: "Variant compare-at price must not be below its price.", path: ["compareAtPrice"] });

const optionGroupSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  nameAr: z.string().trim().min(1).max(200),
  isRequired: z.boolean().default(false),
  allowsMultiple: z.boolean().default(false),
  minSelections: z.coerce.number().int().min(0).max(100).default(0),
  maxSelections: z.coerce.number().int().min(1).max(100).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000),
  values: z.array(optionValueSchema).max(100),
}).refine((value) => !value.isRequired || value.minSelections >= 1, { message: "Required option groups need at least one selection.", path: ["minSelections"] })
  .refine((value) => value.maxSelections == null || value.maxSelections >= value.minSelections, { message: "Maximum selections must not be below the minimum.", path: ["maxSelections"] })
  .refine((value) => value.allowsMultiple || value.maxSelections == null || value.maxSelections <= 1, { message: "Single-select groups cannot allow more than one selection.", path: ["maxSelections"] });

export const productEditorInputSchema = z.object({
  ...productFields,
  defaultVariant: productVariantInputSchema.optional(),
  variants: z.array(productVariantInputSchema).max(100).default([]).refine((variants) => new Set(variants.flatMap((variant) => variant.sku ? [variant.sku] : [])).size === variants.filter((variant) => variant.sku).length, { message: "Variant SKUs must be unique.", path: ["variants"] }),
  images: z.array(imageSchema).max(30),
  optionGroups: z.array(optionGroupSchema).max(20),
}).refine((value) => value.compareAtPrice == null || value.compareAtPrice >= value.basePrice, { message: "Compare-at price must not be below the base price.", path: ["compareAtPrice"] })
  .refine((value) => value.maxQuantity == null || value.maxQuantity >= value.minQuantity, { message: "Maximum quantity must not be below the minimum quantity.", path: ["maxQuantity"] });

export const productBulkActionSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(100).refine((ids) => new Set(ids).size === ids.length, "Product IDs must be unique."),
  action: z.enum(["activate", "draft", "archive", "restore", "category", "price", "tags"]),
  categoryId: z.string().uuid().optional(),
  basePrice: z.coerce.number().finite().min(0).max(999999999).optional(),
  compareAtPrice: z.coerce.number().finite().min(0).max(999999999).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(30).optional().transform((tags) => tags ? [...new Set(tags.map((tag) => tag.toLowerCase()))] : undefined),
}).superRefine((value, context) => {
  if (value.action === "category" && !value.categoryId) context.addIssue({ code: "custom", path: ["categoryId"], message: "A category is required." });
  if (value.action === "price" && value.basePrice == null) context.addIssue({ code: "custom", path: ["basePrice"], message: "A base price is required." });
  if (value.action === "price" && value.compareAtPrice != null && value.basePrice != null && value.compareAtPrice < value.basePrice) context.addIssue({ code: "custom", path: ["compareAtPrice"], message: "Compare-at price must not be below the base price." });
  if (value.action === "tags" && !value.tags?.length) context.addIssue({ code: "custom", path: ["tags"], message: "At least one tag is required." });
});

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  query: z.string().trim().max(200).optional(),
  status: z.enum(["active", "inactive", "all"]).default("all"),
  archived: z.enum(["active", "archived", "all"]).default("active"),
  stock: z.enum(["in-stock", "out-of-stock", "all"]).default("all"),
  categoryId: z.string().uuid().optional(),
  sort: z.enum(["sortOrder", "name", "basePrice", "updatedAt"]).default("sortOrder"),
  direction: z.enum(["asc", "desc"]).default("asc"),
});
