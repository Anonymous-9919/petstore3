import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { revalidateStorefrontCatalog } from "@/server/catalog-cache";
import { db } from "@/server/db";
import { notifyStaff } from "@/server/notifications/staff";
import { writeInventoryMovement } from "@/server/services/inventory-ledger";
import { inventoryAdjustmentSchema, inventoryListQuerySchema, lowStockThresholdSchema } from "@/server/validation/inventory";

export async function GET(request: Request) {
  const authorization = await authorizeAdminApi("inventory", "read");
  if (!authorization.authorized) return authorization.response;

  const parsed = inventoryListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid inventory query." }, { status: 400 });
  const { page, pageSize, branchId, categoryId, stock, query, ledgerLevelId } = parsed.data;

  if (ledgerLevelId) {
    const level = await db.inventoryLevel.findUnique({ where: { id: ledgerLevelId }, select: { id: true, branchId: true, productId: true, variantId: true } });
    if (!level) return NextResponse.json({ error: "Inventory level was not found." }, { status: 404 });
    const [movements, audits] = await Promise.all([
      db.inventoryMovement.findMany({ where: { branchId: level.branchId, productId: level.productId, variantId: level.variantId }, orderBy: { createdAt: "desc" }, take: 100 }),
      db.auditLog.findMany({ where: { entityType: "inventoryLevel", entityId: level.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    ]);
    return NextResponse.json({ movements, audits });
  }

  const where = {
    ...(branchId ? { branchId } : {}),
    ...(categoryId ? { product: { categoryId } } : {}),
    ...(query ? { product: { ...(categoryId ? { categoryId } : {}), OR: [{ name: { contains: query, mode: "insensitive" as const } }, { nameAr: { contains: query, mode: "insensitive" as const } }, { sku: { contains: query, mode: "insensitive" as const } }] } } : {}),
    ...(stock === "in-stock" ? { quantity: { gt: db.inventoryLevel.fields.reserved } } : {}),
    ...(stock === "out-of-stock" ? { quantity: { lte: db.inventoryLevel.fields.reserved } } : {}),
  };
  const select = { id: true, quantity: true, reserved: true, lowStockAt: true, updatedAt: true, variant: { select: { id: true, sku: true, name: true, nameAr: true } }, branch: { select: { id: true, name: true, nameAr: true } }, product: { select: { id: true, name: true, nameAr: true, sku: true, isActive: true, archivedAt: true, category: { select: { id: true, name: true } } } } };

  if (stock === "low-stock") {
    const values: unknown[] = [];
    const bind = (value: unknown) => `$${values.push(value)}`;
    const filters = [`i."quantity" - i.reserved <= i."lowStockAt"`];
    if (branchId) filters.push(`i."branchId" = ${bind(branchId)}::uuid`);
    if (categoryId) filters.push(`p."categoryId" = ${bind(categoryId)}::uuid`);
    if (query) {
      const search = bind(`%${query}%`);
      filters.push(`(p.name ILIKE ${search} OR p."nameAr" ILIKE ${search} OR p.sku ILIKE ${search})`);
    }
    const filterSql = filters.join(" AND ");
    const countValues = [...values];
    const idsQuery = `SELECT i.id FROM "InventoryLevel" i JOIN "Product" p ON p.id = i."productId" WHERE ${filterSql} ORDER BY p.name ASC, i.id ASC LIMIT ${bind(pageSize)} OFFSET ${bind((page - 1) * pageSize)}`;
    const countQuery = `SELECT COUNT(*)::int AS total FROM "InventoryLevel" i JOIN "Product" p ON p.id = i."productId" WHERE ${filterSql}`;
    const [rows, countRows] = await Promise.all([
      db.$queryRawUnsafe<Array<{ id: string }>>(idsQuery, ...values),
      db.$queryRawUnsafe<Array<{ total: number }>>(countQuery, ...countValues),
    ]);
    const ids = rows.map((row) => row.id);
    const levels = ids.length ? await db.inventoryLevel.findMany({ where: { id: { in: ids } }, select }) : [];
    const byId = new Map(levels.map((level) => [level.id, level]));
    const inventoryLevels = ids.flatMap((id) => {
      const level = byId.get(id);
      return level ? [level] : [];
    });
    const total = countRows[0]?.total ?? 0;
    return NextResponse.json({ inventoryLevels, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  }
  const [inventoryLevels, total] = await Promise.all([
    db.inventoryLevel.findMany({ where, orderBy: [{ product: { name: "asc" } }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize, select }),
    db.inventoryLevel.count({ where }),
  ]);
  return NextResponse.json({ inventoryLevels, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

export async function POST(request: Request) {
  const authorization = await authorizeAdminApi("inventory");
  if (!authorization.authorized) return authorization.response;
  const user = authorization.user;

  const parsed = inventoryAdjustmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid inventory adjustment." }, { status: 400 });

  const { inventoryLevelId, quantity, note, reason } = parsed.data;
  const adjustmentReason = reason ?? note;
  const result = await db.$transaction(async (tx) => {
    const level = await tx.inventoryLevel.findUnique({
      where: { id: inventoryLevelId },
      select: { id: true, branchId: true, productId: true, variantId: true, lowStockAt: true, product: { select: { name: true } } },
    });
    if (!level) return null;

    // The condition prevents adjustments from making reserved stock unavailable.
    const updated = await tx.$queryRaw<Array<{ quantity: number; reserved: number }>>`
      UPDATE "InventoryLevel"
      SET "quantity" = "quantity" + ${quantity}, "updatedAt" = NOW()
      WHERE "id" = ${inventoryLevelId}::uuid
        AND "quantity" + ${quantity} >= "reserved"
      RETURNING "quantity", "reserved"
    `;
    if (updated.length !== 1) return false;

    const [after] = updated;
    const beforeQuantity = after.quantity - quantity;
    const movement = await writeInventoryMovement(tx, {
      branchId: level.branchId, productId: level.productId, variantId: level.variantId, type: "ADJUSTMENT", quantity,
      beforeQuantity, afterQuantity: after.quantity, reason: "MANUAL_ADJUSTMENT", reasonValue: adjustmentReason,
      referenceType: "inventoryLevel", referenceId: level.id, correlationId: level.id,
      note: reason ? `${reason}: ${note}` : note, actorId: user.id,
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "inventory.adjusted",
        entityType: "inventoryLevel",
        entityId: level.id,
        before: { quantity: beforeQuantity, reserved: after.reserved },
        after: { quantity: after.quantity, reserved: after.reserved, change: quantity, movementId: (movement as { id: string }).id, reason: adjustmentReason, note },
      },
    });
    return { id: level.id, quantity: after.quantity, reserved: after.reserved, movementId: (movement as { id: string }).id, lowStockAt: level.lowStockAt, productName: level.product?.name ?? "Product" };
  });

  if (result === null) return NextResponse.json({ error: "Inventory level was not found." }, { status: 404 });
  if (result === false) return NextResponse.json({ error: "Adjustment would reduce stock below reserved quantity." }, { status: 409 });
  revalidateStorefrontCatalog();
  const available = result.quantity - result.reserved;
  if (available <= result.lowStockAt) void notifyStaff({ title: "Low stock after adjustment", body: `${result.productName} has ${available} available units (threshold: ${result.lowStockAt}).`, href: "/admin/inventory?stock=low-stock", roles: ["OWNER", "MANAGER", "INVENTORY_STAFF"], excludeUserId: user.id });
  return NextResponse.json({ inventoryLevel: result });
}

export async function PATCH(request: Request) {
  const authorization = await authorizeAdminApi("inventory");
  if (!authorization.authorized) return authorization.response;
  const parsed = lowStockThresholdSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid low-stock threshold." }, { status: 400 });

  const { inventoryLevelId, lowStockAt } = parsed.data;
  const result = await db.$transaction(async (tx) => {
    const level = await tx.inventoryLevel.findUnique({ where: { id: inventoryLevelId }, select: { id: true, lowStockAt: true } });
    if (!level) return null;
    const updated = await tx.inventoryLevel.update({ where: { id: level.id }, data: { lowStockAt }, select: { id: true, lowStockAt: true } });
    await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "inventory.low_stock_threshold_updated", entityType: "inventoryLevel", entityId: level.id, before: { lowStockAt: level.lowStockAt }, after: { lowStockAt: updated.lowStockAt } } });
    return updated;
  });
  if (!result) return NextResponse.json({ error: "Inventory level was not found." }, { status: 404 });
  return NextResponse.json({ inventoryLevel: result });
}
