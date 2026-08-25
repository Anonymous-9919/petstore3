-- Additive only: historical before/after snapshots cannot be safely derived from
-- the current inventory balance, so they intentionally remain nullable.
CREATE TYPE "InventoryMovementReason" AS ENUM (
  'OPENING_BALANCE', 'MANUAL_ADJUSTMENT', 'CSV_IMPORT', 'ORDER_RESERVATION',
  'ORDER_SALE', 'ORDER_RELEASE', 'TRANSFER_DISPATCH', 'TRANSFER_RECEIPT',
  'TRANSFER_CANCELLATION'
);

ALTER TABLE "InventoryMovement"
  ADD COLUMN "beforeQuantity" INTEGER,
  ADD COLUMN "afterQuantity" INTEGER,
  ADD COLUMN "reason" "InventoryMovementReason",
  ADD COLUMN "reasonValue" TEXT,
  ADD COLUMN "referenceType" TEXT,
  ADD COLUMN "referenceId" UUID,
  ADD COLUMN "correlationId" UUID;

-- Safe metadata inference for legacy rows. Quantities remain nullable because
-- ledger ordering alone cannot reconstruct a trustworthy historical balance.
UPDATE "InventoryMovement"
SET "reason" = CASE "type"
  WHEN 'OPENING_BALANCE' THEN 'OPENING_BALANCE'::"InventoryMovementReason"
  WHEN 'ADJUSTMENT' THEN 'MANUAL_ADJUSTMENT'::"InventoryMovementReason"
  WHEN 'RESERVATION' THEN 'ORDER_RESERVATION'::"InventoryMovementReason"
  WHEN 'RELEASE' THEN 'ORDER_RELEASE'::"InventoryMovementReason"
  WHEN 'SALE' THEN 'ORDER_SALE'::"InventoryMovementReason"
  WHEN 'RESTORE' THEN 'ORDER_RELEASE'::"InventoryMovementReason"
  WHEN 'TRANSFER_OUT' THEN 'TRANSFER_DISPATCH'::"InventoryMovementReason"
  WHEN 'TRANSFER_IN' THEN 'TRANSFER_RECEIPT'::"InventoryMovementReason"
END,
"referenceType" = CASE WHEN "orderId" IS NOT NULL THEN 'order' END,
"referenceId" = "orderId",
"correlationId" = "orderId",
"reasonValue" = "note";

CREATE INDEX "InventoryMovement_correlationId_idx" ON "InventoryMovement"("correlationId");
CREATE INDEX "InventoryMovement_referenceType_referenceId_idx" ON "InventoryMovement"("referenceType", "referenceId");

-- Inventory movements are an append-only financial/stock audit record.
CREATE OR REPLACE FUNCTION prevent_inventory_movement_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Inventory movements are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "InventoryMovement_immutable"
BEFORE UPDATE OR DELETE ON "InventoryMovement"
FOR EACH ROW EXECUTE FUNCTION prevent_inventory_movement_mutation();
