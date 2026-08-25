-- Phase 5 additive inventory transfers. Apply with the repository migration flow.
CREATE TYPE "InventoryTransferStatus" AS ENUM ('DRAFT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');

CREATE TABLE "InventoryTransfer" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transferNumber" TEXT NOT NULL,
  "sourceBranchId" UUID NOT NULL,
  "destinationBranchId" UUID NOT NULL,
  "status" "InventoryTransferStatus" NOT NULL DEFAULT 'DRAFT',
  "note" TEXT,
  "createdById" UUID NOT NULL,
  "receivedById" UUID,
  "dispatchedAt" TIMESTAMPTZ(6),
  "receivedAt" TIMESTAMPTZ(6),
  "cancelledAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "InventoryTransfer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryTransfer_transferNumber_key" UNIQUE ("transferNumber"),
  CONSTRAINT "InventoryTransfer_sourceBranchId_fkey" FOREIGN KEY ("sourceBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryTransfer_destinationBranchId_fkey" FOREIGN KEY ("destinationBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryTransfer_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "InventoryTransfer_different_branches" CHECK ("sourceBranchId" <> "destinationBranchId")
);

CREATE TABLE "InventoryTransferLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transferId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "variantId" UUID,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "InventoryTransferLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryTransferLine_transferId_productId_key" UNIQUE ("transferId", "productId"),
  CONSTRAINT "InventoryTransferLine_positive_quantity" CHECK ("quantity" > 0),
  CONSTRAINT "InventoryTransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "InventoryTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InventoryTransferLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryTransferLine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "InventoryTransfer_status_createdAt_idx" ON "InventoryTransfer"("status", "createdAt");
CREATE INDEX "InventoryTransfer_sourceBranchId_status_createdAt_idx" ON "InventoryTransfer"("sourceBranchId", "status", "createdAt");
CREATE INDEX "InventoryTransfer_destinationBranchId_status_createdAt_idx" ON "InventoryTransfer"("destinationBranchId", "status", "createdAt");
CREATE INDEX "InventoryTransferLine_variantId_idx" ON "InventoryTransferLine"("variantId");
