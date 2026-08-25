import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { authorizeAdminApi } from "@/server/auth";
import { revalidateStorefrontCatalog } from "@/server/catalog-cache";
import { db } from "@/server/db";
import { inventoryCsvTemplate, previewInventoryCsv } from "@/server/services/inventory-csv";
import { writeInventoryMovement } from "@/server/services/inventory-ledger";

async function preview(csv: string) {
  const [branches, products, variants] = await Promise.all([
    db.branch.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    db.product.findMany({ where: { archivedAt: null }, select: { id: true, sku: true } }),
    db.productVariant.findMany({ select: { id: true, productId: true, sku: true, isDefault: true } }),
  ]);
  return previewInventoryCsv(csv, { branches, products, variants });
}

export async function GET() {
  const authorization = await authorizeAdminApi("inventory", "read");
  if (!authorization.authorized) return authorization.response;
  return new Response(inventoryCsvTemplate, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=inventory-template.csv" } });
}

export async function POST(request: Request) {
  const authorization = await authorizeAdminApi("inventory");
  if (!authorization.authorized) return authorization.response;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.csv !== "string" || !["preview", "execute"].includes(body.action)) return NextResponse.json({ error: "Provide a CSV string and action of preview or execute." }, { status: 400 });
  try {
    const result = await preview(body.csv);
    if (body.action === "preview") return NextResponse.json(result);
    if (result.errors.length) return NextResponse.json({ error: "Correct CSV validation errors before execution.", ...result }, { status: 400 });
    const importId = randomUUID();
    await db.$transaction(async (tx) => {
      for (const row of result.rows) {
        const existing = await tx.inventoryLevel.findUnique({ where: { branchId_productId_variantId: { branchId: row.branchId, productId: row.productId, variantId: row.variantId } }, select: { id: true, quantity: true, reserved: true } });
        if (!existing) {
          if (row.mode === "SUBTRACT") throw new Error(`Row ${row.row}: cannot subtract stock that does not exist.`);
          const quantity = row.mode === "SET" ? row.quantity : row.quantity;
          const level = await tx.inventoryLevel.create({ data: { branchId: row.branchId, productId: row.productId, variantId: row.variantId, quantity }, select: { id: true, reserved: true } });
          await writeInventoryMovement(tx, { branchId: row.branchId, productId: row.productId, variantId: row.variantId, type: "ADJUSTMENT", quantity, beforeQuantity: 0, afterQuantity: quantity, reason: "CSV_IMPORT", reasonValue: row.mode, referenceType: "inventoryCsv", referenceId: importId, correlationId: importId, note: `CSV ${row.mode}`, actorId: authorization.user.id });
          await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "inventory.csv_executed", entityType: "inventoryLevel", entityId: level.id, before: { quantity: 0, reserved: 0 }, after: { quantity, reserved: level.reserved, mode: row.mode, csvRow: row.row } } });
          continue;
        }
        const next = row.mode === "SET" ? row.quantity : existing.quantity + (row.mode === "ADD" ? row.quantity : -row.quantity);
        if (next < existing.reserved) throw new Error(`Row ${row.row}: quantity cannot be below reserved stock.`);
        await tx.inventoryLevel.update({ where: { id: existing.id }, data: { quantity: next } });
        const change = next - existing.quantity;
        if (change) await writeInventoryMovement(tx, { branchId: row.branchId, productId: row.productId, variantId: row.variantId, type: "ADJUSTMENT", quantity: change, beforeQuantity: existing.quantity, afterQuantity: next, reason: "CSV_IMPORT", reasonValue: row.mode, referenceType: "inventoryCsv", referenceId: importId, correlationId: importId, note: `CSV ${row.mode}`, actorId: authorization.user.id });
        await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "inventory.csv_executed", entityType: "inventoryLevel", entityId: existing.id, before: { quantity: existing.quantity, reserved: existing.reserved }, after: { quantity: next, reserved: existing.reserved, mode: row.mode, csvRow: row.row } } });
      }
    }, { isolationLevel: "Serializable" });
    revalidateStorefrontCatalog();
    return NextResponse.json({ executed: result.rows.length, summary: result.summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process inventory CSV.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
