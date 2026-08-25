-- Move branch stock from the temporary product-level uniqueness model to a
-- variant-level model. Rows for products without a default remain product-level
-- so this is safe for incomplete legacy catalog data.
UPDATE "InventoryLevel" l
SET "variantId" = v."id"
FROM "ProductVariant" v
WHERE v."productId" = l."productId"
  AND v."isDefault"
  AND l."variantId" IS NULL;

UPDATE "InventoryMovement" m
SET "variantId" = v."id"
FROM "ProductVariant" v
WHERE v."productId" = m."productId"
  AND v."isDefault"
  AND m."variantId" IS NULL;

DROP INDEX IF EXISTS "InventoryLevel_branchId_productId_key";
CREATE UNIQUE INDEX "InventoryLevel_branchId_productId_variantId_key"
  ON "InventoryLevel"("branchId", "productId", "variantId");
-- NULL variant IDs remain a compatibility path for products that genuinely lack
-- a default variant; retain the former one-row-per-product invariant there.
CREATE UNIQUE INDEX "InventoryLevel_legacy_product_level_key"
  ON "InventoryLevel"("branchId", "productId")
  WHERE "variantId" IS NULL;

ALTER TABLE "InventoryTransferLine"
  DROP CONSTRAINT IF EXISTS "InventoryTransferLine_transferId_productId_key";
DROP INDEX IF EXISTS "InventoryTransferLine_transferId_productId_key";
CREATE UNIQUE INDEX "InventoryTransferLine_transferId_productId_variantId_key"
  ON "InventoryTransferLine"("transferId", "productId", "variantId");
CREATE UNIQUE INDEX "InventoryTransferLine_legacy_product_level_key"
  ON "InventoryTransferLine"("transferId", "productId")
  WHERE "variantId" IS NULL;
