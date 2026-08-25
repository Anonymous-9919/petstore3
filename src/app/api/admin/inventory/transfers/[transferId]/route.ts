import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { revalidateStorefrontCatalog } from "@/server/catalog-cache";
import { db } from "@/server/db";
import { writeInventoryMovement } from "@/server/services/inventory-ledger";
import { transferActionSchema } from "@/server/validation/inventory-transfers";

export async function PATCH(request: Request, { params }: { params: Promise<{ transferId: string }> }) {
  const authorization = await authorizeAdminApi("inventory");
  if (!authorization.authorized) return authorization.response;
  const parsed = transferActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid transfer action." }, { status: 400 });
  const { transferId } = await params;
  try {
    const transfer = await db.$transaction(async (tx) => {
      const current = await tx.inventoryTransfer.findUnique({ where: { id: transferId }, include: { lines: true } });
      if (!current) return null;
      const expected = parsed.data.action === "dispatch" ? "DRAFT" : parsed.data.action === "receive" ? "IN_TRANSIT" : current.status === "DRAFT" || current.status === "IN_TRANSIT" ? current.status : "";
      if (current.status !== expected) throw new Error(`Transfer cannot be ${parsed.data.action}ed from ${current.status}.`);
      const missingVariantProductIds = current.lines.filter((line) => !line.variantId).map((line) => line.productId);
      const defaultVariants = missingVariantProductIds.length ? await tx.productVariant.findMany({ where: { productId: { in: missingVariantProductIds }, isDefault: true }, select: { id: true, productId: true } }) : [];
      const normalizedLines = current.lines.map((line) => ({ ...line, variantId: line.variantId ?? defaultVariants.find((variant) => variant.productId === line.productId)?.id }));
      if (normalizedLines.some((line) => !line.variantId)) throw new Error("Transfer line has no default variant.");
      const lines = normalizedLines as Array<(typeof current.lines)[number] & { variantId: string }>;
      if (parsed.data.action === "dispatch") {
        for (const line of lines) {
          const updated = await tx.$queryRaw<Array<{ id: string; quantity: number }>>`
            UPDATE "InventoryLevel"
            SET "quantity" = "quantity" - ${line.quantity}, "updatedAt" = NOW()
            WHERE "branchId" = ${current.sourceBranchId}::uuid
              AND "productId" = ${line.productId}::uuid
              AND "variantId" = ${line.variantId}::uuid
              AND "quantity" - "reserved" >= ${line.quantity}
            RETURNING "id", "quantity"
          `;
          if (updated.length !== 1) throw new Error("Source inventory is insufficient or reserved for orders.");
          await writeInventoryMovement(tx, { branchId: current.sourceBranchId, productId: line.productId, variantId: line.variantId, type: "TRANSFER_OUT", quantity: -line.quantity, beforeQuantity: updated[0].quantity + line.quantity, afterQuantity: updated[0].quantity, reason: "TRANSFER_DISPATCH", reasonValue: "dispatch", referenceType: "inventoryTransfer", referenceId: current.id, correlationId: current.id, note: `Transfer ${current.transferNumber}`, actorId: authorization.user.id });
        }
      } else if (parsed.data.action === "receive") {
        for (const line of lines) {
          const level = await tx.inventoryLevel.upsert({ where: { branchId_productId_variantId: { branchId: current.destinationBranchId, productId: line.productId, variantId: line.variantId } }, create: { branchId: current.destinationBranchId, productId: line.productId, variantId: line.variantId, quantity: line.quantity }, update: { quantity: { increment: line.quantity } }, select: { id: true, quantity: true, reserved: true } });
          await writeInventoryMovement(tx, { branchId: current.destinationBranchId, productId: line.productId, variantId: line.variantId, type: "TRANSFER_IN", quantity: line.quantity, beforeQuantity: level.quantity - line.quantity, afterQuantity: level.quantity, reason: "TRANSFER_RECEIPT", reasonValue: "receive", referenceType: "inventoryTransfer", referenceId: current.id, correlationId: current.id, note: `Transfer ${current.transferNumber}`, actorId: authorization.user.id });
          await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "inventory.transfer_received_line", entityType: "inventoryLevel", entityId: level.id, after: { transferId: current.id, quantity: level.quantity, reserved: level.reserved, change: line.quantity } } });
        }
      } else if (current.status === "IN_TRANSIT") {
        for (const line of lines) {
          const level = await tx.inventoryLevel.update({ where: { branchId_productId_variantId: { branchId: current.sourceBranchId, productId: line.productId, variantId: line.variantId } }, data: { quantity: { increment: line.quantity } }, select: { quantity: true } });
          await writeInventoryMovement(tx, { branchId: current.sourceBranchId, productId: line.productId, variantId: line.variantId, type: "TRANSFER_IN", quantity: line.quantity, beforeQuantity: level.quantity - line.quantity, afterQuantity: level.quantity, reason: "TRANSFER_CANCELLATION", reasonValue: "cancel", referenceType: "inventoryTransfer", referenceId: current.id, correlationId: current.id, note: `Cancelled transfer ${current.transferNumber}`, actorId: authorization.user.id });
        }
      }
      const status = parsed.data.action === "dispatch" ? "IN_TRANSIT" : parsed.data.action === "receive" ? "RECEIVED" : "CANCELLED";
      const updated = await tx.inventoryTransfer.update({ where: { id: current.id }, data: { status, ...(status === "IN_TRANSIT" ? { dispatchedAt: new Date() } : {}), ...(status === "RECEIVED" ? { receivedAt: new Date(), receivedById: authorization.user.id } : {}), ...(status === "CANCELLED" ? { cancelledAt: new Date() } : {}) } });
      await tx.auditLog.create({ data: { actorId: authorization.user.id, action: `inventory.transfer_${parsed.data.action}ed`, entityType: "inventoryTransfer", entityId: current.id, before: { status: current.status }, after: { status: updated.status } } });
      return updated;
    }, { isolationLevel: "Serializable" });
    if (!transfer) return NextResponse.json({ error: "Transfer was not found." }, { status: 404 });
    revalidateStorefrontCatalog();
    return NextResponse.json({ transfer });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update transfer." }, { status: 409 });
  }
}
