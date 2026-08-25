-- Additive Phase 6 extension. Review and deploy through the normal migration process only.
ALTER TYPE "public"."PromotionBenefit" ADD VALUE IF NOT EXISTS 'BUY_X_GET_Y';
ALTER TYPE "public"."PromotionBenefit" ADD VALUE IF NOT EXISTS 'QUANTITY_TIER';
ALTER TYPE "public"."PromotionBenefit" ADD VALUE IF NOT EXISTS 'FREE_ITEM';

ALTER TABLE "public"."Promotion"
  ADD COLUMN "qualifyingProductIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  ADD COLUMN "rewardProductIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  ADD COLUMN "rewardQuantity" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "public"."StoreAsset"
  ADD COLUMN "placement" TEXT NOT NULL DEFAULT 'HOMEPAGE',
  ADD COLUMN "categoryId" UUID,
  ADD COLUMN "archivedAt" TIMESTAMPTZ(6),
  ADD CONSTRAINT "StoreAsset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "StoreAsset_placement_categoryId_status_sortOrder_idx"
  ON "public"."StoreAsset"("placement", "categoryId", "status", "sortOrder");
