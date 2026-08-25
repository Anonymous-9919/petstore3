-- Phase 3 is deliberately expand/backfill only. Do not remove or rename legacy
-- identifiers, product commercial fields, or product-level inventory in this migration.
-- See docs/phase-3-schema-evolution-runbook.md before deploying.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SEQUENCE "Category_publicId_seq";
CREATE SEQUENCE "Product_publicId_seq";
CREATE SEQUENCE "ProductOptionGroup_publicId_seq";
CREATE SEQUENCE "ProductOptionValue_publicId_seq";
CREATE SEQUENCE "Branch_publicId_seq";
CREATE SEQUENCE "Area_publicId_seq";
CREATE SEQUENCE "ProductVariant_publicId_seq";

ALTER TABLE "Category" ADD COLUMN "publicId" INTEGER;
ALTER TABLE "Product" ADD COLUMN "publicId" INTEGER;
ALTER TABLE "ProductOptionGroup" ADD COLUMN "publicId" INTEGER;
ALTER TABLE "ProductOptionValue" ADD COLUMN "publicId" INTEGER;
ALTER TABLE "Branch" ADD COLUMN "publicId" INTEGER;
ALTER TABLE "Area" ADD COLUMN "publicId" INTEGER;

-- Reuse valid legacy public numbers where possible so persisted storefront carts
-- continue to resolve. New numbers are allocated above every existing legacy ID.
DO $$
DECLARE table_name TEXT; invalid_count BOOLEAN; duplicate_count BOOLEAN;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['Category', 'Product', 'ProductOptionGroup', 'ProductOptionValue', 'Branch', 'Area'] LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE "legacyId" > 0 GROUP BY "legacyId" HAVING COUNT(*) > 1)', table_name) INTO duplicate_count;
    IF duplicate_count THEN RAISE EXCEPTION 'Phase 3 cannot reuse duplicate legacy IDs in %', table_name; END IF;
    EXECUTE format('UPDATE %I SET "publicId" = "legacyId" WHERE "legacyId" > 0', table_name);
    EXECUTE format('SELECT setval(%L::regclass, GREATEST(COALESCE((SELECT MAX("publicId") FROM %I), 0), COALESCE((SELECT MAX("legacyId") FROM %I), 0)) + 1, false)', '"' || table_name || '_publicId_seq"', table_name, table_name);
    EXECUTE format('UPDATE %I SET "publicId" = nextval(%L::regclass) WHERE "publicId" IS NULL', table_name, '"' || table_name || '_publicId_seq"');
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE "publicId" IS NULL OR "publicId" <= 0)', table_name) INTO invalid_count;
    IF invalid_count THEN RAISE EXCEPTION 'Phase 3 public ID backfill failed for %', table_name; END IF;
  END LOOP;
END $$;

ALTER TABLE "Category" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "ProductOptionGroup" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "ProductOptionValue" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "Branch" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "Area" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "publicId" SET DEFAULT nextval('"Category_publicId_seq"');
ALTER TABLE "Product" ALTER COLUMN "publicId" SET DEFAULT nextval('"Product_publicId_seq"');
ALTER TABLE "ProductOptionGroup" ALTER COLUMN "publicId" SET DEFAULT nextval('"ProductOptionGroup_publicId_seq"');
ALTER TABLE "ProductOptionValue" ALTER COLUMN "publicId" SET DEFAULT nextval('"ProductOptionValue_publicId_seq"');
ALTER TABLE "Branch" ALTER COLUMN "publicId" SET DEFAULT nextval('"Branch_publicId_seq"');
ALTER TABLE "Area" ALTER COLUMN "publicId" SET DEFAULT nextval('"Area_publicId_seq"');
CREATE UNIQUE INDEX "Category_publicId_key" ON "Category"("publicId");
CREATE UNIQUE INDEX "Product_publicId_key" ON "Product"("publicId");
CREATE UNIQUE INDEX "ProductOptionGroup_publicId_key" ON "ProductOptionGroup"("publicId");
CREATE UNIQUE INDEX "ProductOptionValue_publicId_key" ON "ProductOptionValue"("publicId");
CREATE UNIQUE INDEX "Branch_publicId_key" ON "Branch"("publicId");
CREATE UNIQUE INDEX "Area_publicId_key" ON "Area"("publicId");

CREATE TABLE "ProductVariant" (
  "id" UUID NOT NULL,
  "publicId" INTEGER NOT NULL DEFAULT nextval('"ProductVariant_publicId_seq"'),
  "productId" UUID NOT NULL,
  "sku" TEXT,
  "barcode" TEXT,
  "name" TEXT,
  "nameAr" TEXT,
  "price" DECIMAL(12,3) NOT NULL,
  "compareAtPrice" DECIMAL(12,3),
  "cost" DECIMAL(12,3),
  "weight" DECIMAL(12,3),
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- The default variant mirrors existing product fields. This is idempotent for a
-- fresh migration and the unique partial index prevents multiple defaults later.
INSERT INTO "ProductVariant" ("id", "productId", "sku", "price", "compareAtPrice", "isDefault", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), p."id", p."sku", p."basePrice", p."compareAtPrice", true, p."isActive", p."createdAt", p."updatedAt"
FROM "Product" p
WHERE NOT EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = p."id" AND v."isDefault");

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Product" p WHERE NOT EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = p."id" AND v."isDefault")) THEN
    RAISE EXCEPTION 'Phase 3 variant backfill left products without a default variant';
  END IF;
END $$;

CREATE UNIQUE INDEX "ProductVariant_publicId_key" ON "ProductVariant"("publicId");
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
CREATE UNIQUE INDEX "ProductVariant_barcode_key" ON "ProductVariant"("barcode");
CREATE UNIQUE INDEX "ProductVariant_one_default_per_product" ON "ProductVariant"("productId") WHERE "isDefault";
CREATE INDEX "ProductVariant_productId_isActive_idx" ON "ProductVariant"("productId", "isActive");

-- These nullable links record the selected variant while product-level stock and
-- reservation columns remain authoritative during the dual-read rollout.
ALTER TABLE "InventoryLevel" ADD COLUMN "variantId" UUID;
ALTER TABLE "InventoryReservation" ADD COLUMN "variantId" UUID;
ALTER TABLE "InventoryMovement" ADD COLUMN "variantId" UUID;
ALTER TABLE "OrderItem" ADD COLUMN "variantId" UUID;
ALTER TABLE "InventoryLevel" ADD CONSTRAINT "InventoryLevel_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "InventoryLevel" l SET "variantId" = v."id" FROM "ProductVariant" v WHERE v."productId" = l."productId" AND v."isDefault" AND l."variantId" IS NULL;
CREATE INDEX "InventoryLevel_variantId_idx" ON "InventoryLevel"("variantId");
CREATE INDEX "InventoryReservation_branchId_variantId_status_idx" ON "InventoryReservation"("branchId", "variantId", "status");
CREATE INDEX "InventoryMovement_branchId_variantId_createdAt_idx" ON "InventoryMovement"("branchId", "variantId", "createdAt");
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");
