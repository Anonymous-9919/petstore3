import "server-only";

import { parseCsv, MAX_IMPORT_BYTES, MAX_IMPORT_ROWS } from "@/server/services/product-import";

export const inventoryCsvTemplate = "sku,branch,quantity,mode\nPET-001,Main Store,10,Set\n";
export type InventoryCsvError = { row: number; field?: string; message: string };
export type InventoryCsvRow = { row: number; sku: string; branchId: string; productId: string; variantId: string; quantity: number; mode: "SET" | "ADD" | "SUBTRACT" };

type Context = { branches: Array<{ id: string; name: string }>; products: Array<{ id: string; sku: string | null }>; variants: Array<{ id: string; productId: string; sku: string | null; isDefault?: boolean }> };

export function previewInventoryCsv(csv: string, context: Context) {
  if (Buffer.byteLength(csv, "utf8") > MAX_IMPORT_BYTES) throw new Error("CSV must be 5 MB or smaller.");
  const { headers, rows } = parseCsv(csv);
  const errors: InventoryCsvError[] = [];
  for (const field of ["sku", "branch", "quantity", "mode"]) if (!headers.includes(field)) errors.push({ row: 1, field, message: `Required column '${field}' is missing.` });
  const branchByName = new Map(context.branches.map((branch) => [branch.name.trim().toLowerCase(), branch.id]));
  const productBySku = new Map(context.products.flatMap((product) => product.sku ? [[product.sku.toLowerCase(), product] as const] : []));
  const variantBySku = new Map(context.variants.flatMap((variant) => variant.sku ? [[variant.sku.toLowerCase(), variant] as const] : []));
  const seen = new Set<string>(); const validRows: InventoryCsvRow[] = [];
  rows.forEach((cells, index) => {
    const row = index + 2; const record = Object.fromEntries(headers.map((header, position) => [header, (cells[position] ?? "").trim()]));
    const sku = record.sku ?? ""; const branchText = record.branch ?? ""; const quantity = Number(record.quantity); const mode = (record.mode ?? "").toUpperCase();
    const product = productBySku.get(sku.toLowerCase()); const variant = variantBySku.get(sku.toLowerCase()); const item = variant ?? product;
    const branchId = branchByName.get(branchText.toLowerCase());
    if (!item) errors.push({ row, field: "sku", message: "SKU or variant SKU was not found." });
    if (!branchId) errors.push({ row, field: "branch", message: "Branch was not found." });
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1_000_000) errors.push({ row, field: "quantity", message: "Quantity must be a whole number from 0 to 1000000." });
    if (mode !== "SET" && mode !== "ADD" && mode !== "SUBTRACT") errors.push({ row, field: "mode", message: "Mode must be Set, Add, or Subtract." });
    const productId = variant ? variant.productId : product?.id;
    const variantId = variant?.id ?? context.variants.find((candidate) => candidate.productId === productId && candidate.isDefault)?.id ?? null;
    if (product && !variantId) errors.push({ row, field: "sku", message: "Product SKU requires a default variant." });
    const key = branchId && productId ? `${branchId}:${productId}:${variantId ?? "legacy"}` : "";
    if (key && seen.has(key)) errors.push({ row, field: "sku", message: "Only one row per branch and variant is allowed." });
    else if (key) seen.add(key);
    if (item && branchId && productId && variantId && Number.isInteger(quantity) && quantity >= 0 && quantity <= 1_000_000 && (mode === "SET" || mode === "ADD" || mode === "SUBTRACT") && !errors.some((error) => error.row === row)) validRows.push({ row, sku, branchId, productId, variantId, quantity, mode });
  });
  return { headers, errors, rows: validRows, summary: { total: rows.length, valid: validRows.length, invalid: new Set(errors.filter((error) => error.row > 1).map((error) => error.row)).size } };
}

export { MAX_IMPORT_ROWS };
