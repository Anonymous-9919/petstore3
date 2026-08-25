import "server-only";

import { productInputSchema, productVariantInputSchema } from "@/server/validation/catalog";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2_000;
export const IMPORT_BATCH_SIZE = 50;
export const importModes = ["create", "update", "upsert"] as const;
export type ImportMode = typeof importModes[number];
const fields = ["handle", "variant_sku", "variant_public_id", "product_sku", "barcode", "cost", "weight", "variant_name", "variant_name_ar", "variant_price", "variant_compare_at_price", "variant_is_active", "category_slug", "name", "name_ar", "description", "description_ar", "short_description", "short_description_ar", "base_price", "compare_at_price", "primary_image_path", "image_url", "sort_order", "is_active", "is_featured", "allow_preorder", "is_delivery_enabled", "is_pickup_enabled", "min_quantity", "max_quantity", "quantity_increment"] as const;
type Field = typeof fields[number];
export type ImportError = { row: number; field?: string; message: string };
export type ImportRow = { row: number; product: Record<string, unknown>; variant: Record<string, unknown>; variantPublicId: number | null; inventory: Array<{ branchId: string; quantity: number }>; imagePaths: string[]; imageUrl: string | null };
export type ImportContext = { categories: Array<{ id: string; slug: string }>; branches: Array<{ id: string; name: string }>; products: Array<{ id: string; slug: string; sku: string | null }>; variants?: Array<{ id: string; publicId: number; productId: string; sku: string | null }> };

const aliases: Partial<Record<Field, string[]>> = { handle: ["slug", "product_handle", "product slug"], variant_sku: ["sku", "variant sku"], category_slug: ["category", "category slug"], name: ["product_name", "product name", "title"], name_ar: ["product_name_ar", "product name ar"], base_price: ["price", "regular_price", "regular price"], primary_image_path: ["image", "image_path", "image path"], image_url: ["image url", "remote image url"] };
const normalizeHeader = (header: string) => header.trim().toLowerCase().replace(/[ _-]+/g, "");

/** Resolve common export headings while preserving any explicit user mapping. */
export function resolveMapping(headers: string[], mapping: Record<string, string> = {}) {
  const resolved = { ...mapping };
  for (const field of fields) {
    if (resolved[field]) continue;
    const candidates = [field, ...(aliases[field] ?? [])].map(normalizeHeader);
    const header = headers.find((candidate) => candidates.includes(normalizeHeader(candidate)));
    if (header) resolved[field] = header;
  }
  return resolved;
}

export function isApprovedMediaPath(path: string) {
  return /^uploads\/\d{4}-\d{2}-\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpe?g|png|webp|gif|avif)$/i.test(path);
}

export function branchColumn(name: string) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `inventory_${slug || "branch"}`;
}

export function parseCsv(csv: string): { headers: string[]; rows: string[][] } {
  if (Buffer.byteLength(csv, "utf8") > MAX_IMPORT_BYTES) throw new Error("CSV must be 5 MB or smaller.");
  const rows: string[][] = []; let row: string[] = []; let value = ""; let quoted = false;
  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    if (char === '"') { if (quoted && csv[i + 1] === '"') { value += '"'; i += 1; } else quoted = !quoted; }
    else if (char === "," && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && csv[i + 1] === "\n") i += 1; row.push(value); if (row.some((cell) => cell.length)) rows.push(row); row = []; value = ""; }
    else value += char;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted value.");
  row.push(value); if (row.some((cell) => cell.length)) rows.push(row);
  if (!rows.length) throw new Error("CSV is empty.");
  const headers = rows.shift()!.map((header) => header.replace(/^\uFEFF/, "").trim());
  if (!headers.length || headers.some((header) => !header)) throw new Error("CSV headers must not be empty.");
  if (new Set(headers.map((header) => header.toLowerCase())).size !== headers.length) throw new Error("CSV headers must be unique.");
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`CSV is limited to ${MAX_IMPORT_ROWS} rows.`);
  return { headers, rows };
}

function value(row: Record<string, string>, field: Field, mapping: Record<string, string>, legacy = "") {
  return row[mapping[field] ?? field]?.trim() ?? row[legacy]?.trim() ?? "";
}
function nullable(text: string) { return text === "" ? null : text; }
function bool(text: string, fallback: boolean) { if (text === "") return fallback; if (/^(true|1|yes)$/i.test(text)) return true; if (/^(false|0|no)$/i.test(text)) return false; return text; }
function number(text: string, fallback?: number | null) { return text === "" ? fallback : Number(text); }

export function templateCsv(branches: Array<{ name: string }>) {
  return [...fields, ...branches.map((branch) => branchColumn(branch.name))].join(",") + "\n";
}

export function previewImport(input: { csv: string; mapping?: Record<string, string>; mode?: ImportMode; imagePathsByRow?: Record<number, string[]> } & ImportContext) {
  const { headers, rows } = parseCsv(input.csv); const mapping = resolveMapping(headers, input.mapping); const mode = input.mode ?? "upsert"; const modern = headers.some((header) => ["handle", "variantsku"].includes(normalizeHeader(header)));
  const errors: ImportError[] = []; const categories = new Map(input.categories.map((category) => [category.slug, category.id]));
  const branchHeaders = new Map<string, string>();
  for (const branch of input.branches) { const header = branchColumn(branch.name); if (branchHeaders.has(header)) errors.push({ row: 1, field: header, message: "Branch names produce duplicate inventory headers." }); else branchHeaders.set(header, branch.id); }
  const required = modern ? ["handle", "variant_sku", "category_slug", "name", "name_ar", "base_price"] : ["slug", "category_slug", "name", "name_ar", "base_price"];
  for (const field of required) if (!headers.includes(mapping[field] ?? field)) errors.push({ row: 1, field, message: `Required column '${mapping[field] ?? field}' is missing.` });
  const productsBySlug = new Map(input.products.map((product) => [product.slug, product])); const productsBySku = new Map(input.products.flatMap((product) => product.sku ? [[product.sku, product] as const] : []));
  const variantsBySku = new Map((input.variants ?? []).flatMap((variant) => variant.sku ? [[variant.sku, variant] as const] : [])); const variantsByPublicId = new Map((input.variants ?? []).map((variant) => [variant.publicId, variant]));
  const identities = new Set<string>(); const inventoryIdentities = new Set<string>(); const validRows: ImportRow[] = []; let creates = 0; let updates = 0;
  rows.forEach((cells, index) => {
    const rowNumber = index + 2; const record = Object.fromEntries(headers.map((header, position) => [header, cells[position] ?? ""]));
    const handle = value(record, "handle", mapping, "slug"); const variantSku = nullable(value(record, "variant_sku", mapping, "sku")); const publicIdText = value(record, "variant_public_id", mapping);
    const variantPublicId = publicIdText === "" ? null : Number(publicIdText); const identity = `${handle}:${variantPublicId ?? variantSku ?? ""}`;
    if (!handle) errors.push({ row: rowNumber, field: modern ? "handle" : "slug", message: "Product handle is required." });
    if (!variantSku && variantPublicId == null) errors.push({ row: rowNumber, field: "variant_sku", message: "Variant SKU or variant public ID is required." });
    if (handle && (variantSku || variantPublicId != null) && identities.has(identity)) errors.push({ row: rowNumber, field: "variant_sku", message: "Duplicate handle and variant identity in this CSV." }); else identities.add(identity);
    if (variantPublicId != null && (!Number.isSafeInteger(variantPublicId) || variantPublicId < 1)) errors.push({ row: rowNumber, field: "variant_public_id", message: "Variant public ID must be a positive whole number." });
    const categoryId = categories.get(value(record, "category_slug", mapping)); if (!categoryId) errors.push({ row: rowNumber, field: "category_slug", message: "Category slug does not exist." });
    const productSku = modern ? nullable(value(record, "product_sku", mapping)) : variantSku;
    const imagePaths = input.imagePathsByRow?.[rowNumber] ?? []; const primaryImagePath = imagePaths[0] ?? nullable(value(record, "primary_image_path", mapping)); const imageUrl = nullable(value(record, "image_url", mapping));
    if (primaryImagePath && !isApprovedMediaPath(primaryImagePath)) errors.push({ row: rowNumber, field: "primary_image_path", message: "Images must use an approved media upload path." });
    if (imageUrl && (() => { try { return new URL(imageUrl).protocol !== "https:"; } catch { return true; } })()) errors.push({ row: rowNumber, field: "image_url", message: "Image URL must be a valid HTTPS URL." });
    const product = { categoryId, slug: handle, ...(productSku !== null ? { sku: productSku } : {}), name: value(record, "name", mapping), nameAr: value(record, "name_ar", mapping), description: nullable(value(record, "description", mapping)), descriptionAr: nullable(value(record, "description_ar", mapping)), shortDescription: nullable(value(record, "short_description", mapping)), shortDescriptionAr: nullable(value(record, "short_description_ar", mapping)), basePrice: number(value(record, "base_price", mapping)), compareAtPrice: number(value(record, "compare_at_price", mapping), null), primaryImagePath, sortOrder: number(value(record, "sort_order", mapping), 0), isActive: bool(value(record, "is_active", mapping), true), isFeatured: bool(value(record, "is_featured", mapping), false), allowPreorder: bool(value(record, "allow_preorder", mapping), false), isDeliveryEnabled: bool(value(record, "is_delivery_enabled", mapping), true), isPickupEnabled: bool(value(record, "is_pickup_enabled", mapping), true), minQuantity: number(value(record, "min_quantity", mapping), 1), maxQuantity: number(value(record, "max_quantity", mapping), null), quantityIncrement: number(value(record, "quantity_increment", mapping), 1) };
    const parsed = productInputSchema.safeParse(product);
    const variant = { sku: variantSku, barcode: nullable(value(record, "barcode", mapping)), cost: number(value(record, "cost", mapping), null), weight: number(value(record, "weight", mapping), null), name: nullable(value(record, "variant_name", mapping)), nameAr: nullable(value(record, "variant_name_ar", mapping)), price: number(value(record, "variant_price", mapping), product.basePrice), compareAtPrice: number(value(record, "variant_compare_at_price", mapping), product.compareAtPrice), isActive: bool(value(record, "variant_is_active", mapping), true) };
    const parsedVariant = productVariantInputSchema.safeParse(variant);
    if (!parsed.success) parsed.error.issues.forEach((issue) => errors.push({ row: rowNumber, field: String(issue.path[0] ?? "row"), message: issue.message }));
    if (!parsedVariant.success) parsedVariant.error.issues.forEach((issue) => errors.push({ row: rowNumber, field: String(issue.path[0] ?? "variant"), message: issue.message }));
    const slugProduct = productsBySlug.get(handle); const skuProduct = !modern && variantSku ? productsBySku.get(variantSku) : undefined; const productMatch = slugProduct ?? skuProduct; const skuVariant = variantSku ? variantsBySku.get(variantSku) : undefined; const idVariant = variantPublicId != null ? variantsByPublicId.get(variantPublicId) : undefined;
    if (slugProduct && skuProduct && slugProduct.id !== skuProduct.id) errors.push({ row: rowNumber, field: "sku", message: "Slug and SKU identify different existing products." });
    if (variantPublicId != null && !idVariant) errors.push({ row: rowNumber, field: "variant_public_id", message: "Variant public ID was not found." });
    if (skuVariant && idVariant && skuVariant.id !== idVariant.id) errors.push({ row: rowNumber, field: "variant_public_id", message: "Variant SKU and public ID identify different variants." });
    const targetVariant = idVariant ?? skuVariant;
    if (targetVariant && productMatch && targetVariant.productId !== productMatch.id) errors.push({ row: rowNumber, field: "variant_sku", message: "Handle and variant identity identify different products." });
    if (targetVariant && !productMatch) errors.push({ row: rowNumber, field: "handle", message: "A variant identity can only be imported into its existing product handle." });
    const exists = Boolean(productMatch || targetVariant);
    if (mode === "create" && exists) errors.push({ row: rowNumber, field: "handle", message: "Create mode cannot overwrite an existing product or variant." });
    if (mode === "update" && !targetVariant) errors.push({ row: rowNumber, field: "variant_sku", message: "Update mode requires an existing variant SKU or public ID." });
    const inventory: ImportRow["inventory"] = [];
      for (const [header, branchId] of branchHeaders) if (header in record && record[header].trim() !== "") { const quantity = Number(record[header]); const inventoryIdentity = `${branchId}:${identity}`; if (inventoryIdentities.has(inventoryIdentity)) errors.push({ row: rowNumber, field: header, message: "Only one inventory value per branch and variant is allowed." }); else inventoryIdentities.add(inventoryIdentity); if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1_000_000) errors.push({ row: rowNumber, field: header, message: "Inventory must be a whole number from 0 to 1000000." }); else inventory.push({ branchId, quantity }); }
    if (parsed.success && parsedVariant.success && categoryId && handle && (variantSku || variantPublicId != null) && !errors.some((error) => error.row === rowNumber)) { validRows.push({ row: rowNumber, product: parsed.data, variant: parsedVariant.data, variantPublicId, inventory, imagePaths, imageUrl }); if (productMatch || targetVariant) updates += 1; else creates += 1; }
  });
   return { headers, mapping, mode, errors, rows: validRows, summary: { total: rows.length, valid: validRows.length, invalid: new Set(errors.filter((error) => error.row > 1).map((error) => error.row)).size, creates, updates } };
}

export function errorsCsv(errors: ImportError[]) { const escape = (value: string | number | undefined) => `"${String(value ?? "").replaceAll('"', '""')}"`; return ["row,field,message", ...errors.map((error) => [error.row, error.field, error.message].map(escape).join(","))].join("\n") + "\n"; }
