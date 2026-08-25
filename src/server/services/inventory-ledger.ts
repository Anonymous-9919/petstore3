import { InventoryMovementReason, InventoryMovementType, Prisma } from "@prisma/client";

type InventoryLedgerEntry = Pick<Prisma.InventoryMovementUncheckedCreateInput,
  "branchId" | "productId" | "variantId" | "orderId" | "type" | "quantity" | "beforeQuantity" |
  "afterQuantity" | "reason" | "reasonValue" | "referenceType" | "referenceId" | "correlationId" | "note" | "actorId"> & {
  type: InventoryMovementType;
  beforeQuantity: number;
  afterQuantity: number;
  reason: InventoryMovementReason;
  reasonValue: string;
  referenceType: string;
  referenceId: string;
  correlationId: string;
};

// All new movements go through this writer so each append has its full context.
export async function writeInventoryMovement(tx: Pick<Prisma.TransactionClient, "inventoryMovement">, entry: InventoryLedgerEntry) {
  return tx.inventoryMovement.create({ data: entry });
}
