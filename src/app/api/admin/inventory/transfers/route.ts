import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { createTransferSchema, transferListQuerySchema } from "@/server/validation/inventory-transfers";

export async function GET(request: Request) {
  const authorization = await authorizeAdminApi("inventory", "read");
  if (!authorization.authorized) return authorization.response;
  const parsed = transferListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid transfer query." }, { status: 400 });
  const { page, pageSize, status, branchId } = parsed.data;
  const where = { ...(status ? { status } : {}), ...(branchId ? { OR: [{ sourceBranchId: branchId }, { destinationBranchId: branchId }] } : {}) };
  const [transfers, total] = await Promise.all([
    db.inventoryTransfer.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { sourceBranch: { select: { id: true, name: true } }, destinationBranch: { select: { id: true, name: true } }, lines: { select: { id: true, productId: true, variantId: true, quantity: true } } } }),
    db.inventoryTransfer.count({ where }),
  ]);
  const products = await db.product.findMany({ where: { id: { in: transfers.flatMap((transfer) => transfer.lines.map((line) => line.productId)) } }, select: { id: true, name: true, sku: true } });
  const productById = new Map(products.map((product) => [product.id, product]));
  return NextResponse.json({ transfers: transfers.map((transfer) => ({ ...transfer, lines: transfer.lines.map((line) => ({ ...line, product: productById.get(line.productId) ?? { id: line.productId, name: "Product unavailable", sku: null } })) })), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

export async function POST(request: Request) {
  const authorization = await authorizeAdminApi("inventory");
  if (!authorization.authorized) return authorization.response;
  const parsed = createTransferSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid transfer." }, { status: 400 });
  const input = parsed.data;
  const result = await db.$transaction(async (tx) => {
    const branches = await tx.branch.count({ where: { id: { in: [input.sourceBranchId, input.destinationBranchId] }, isActive: true } });
    if (branches !== 2) return null;
    const products = await tx.product.findMany({ where: { id: { in: input.lines.map((line) => line.productId) }, archivedAt: null }, select: { id: true } });
    if (products.length !== new Set(input.lines.map((line) => line.productId)).size) return false;
    const variants = await tx.productVariant.findMany({ where: { OR: input.lines.map((line) => line.variantId ? { id: line.variantId, productId: line.productId } : { productId: line.productId, isDefault: true }) }, select: { id: true, productId: true } });
    if (variants.length !== input.lines.length) return false;
    const lines = input.lines.map((line) => ({ ...line, variantId: line.variantId ?? variants.find((variant) => variant.productId === line.productId)?.id }));
    if (lines.some((line) => !line.variantId)) return false;
    const transfer = await tx.inventoryTransfer.create({ data: { transferNumber: `TRF-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`, sourceBranchId: input.sourceBranchId, destinationBranchId: input.destinationBranchId, note: input.note, createdById: authorization.user.id, lines: { create: lines.map((line) => ({ ...line, variantId: line.variantId as string })) } }, include: { lines: true } });
    await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "inventory.transfer_created", entityType: "inventoryTransfer", entityId: transfer.id, after: { status: transfer.status, sourceBranchId: transfer.sourceBranchId, destinationBranchId: transfer.destinationBranchId, lines: transfer.lines.map((line) => ({ productId: line.productId, variantId: line.variantId, quantity: line.quantity })) } } });
    return transfer;
  });
  if (result === null) return NextResponse.json({ error: "Source and destination must be active branches." }, { status: 400 });
  if (result === false) return NextResponse.json({ error: "One or more products are unavailable." }, { status: 400 });
  return NextResponse.json({ transfer: result }, { status: 201 });
}
