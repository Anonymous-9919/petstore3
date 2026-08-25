-- Additive Phase 6 promotion capabilities. Do not deploy from this workspace.
CREATE TYPE "public"."PromotionBenefit" AS ENUM ('DISCOUNT', 'FREE_DELIVERY');
CREATE TYPE "public"."PromotionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'EXPIRED', 'DISABLED');

ALTER TABLE "public"."Promotion"
  ADD COLUMN "benefit" "public"."PromotionBenefit" NOT NULL DEFAULT 'DISCOUNT',
  ADD COLUMN "status" "public"."PromotionStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "minimumQuantity" INTEGER,
  ADD COLUMN "firstOrderOnly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "maxDiscount" DECIMAL(12,3),
  ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isStackable" BOOLEAN NOT NULL DEFAULT false;

UPDATE "public"."Promotion" SET "status" = CASE WHEN "isActive" THEN 'ACTIVE'::"public"."PromotionStatus" ELSE 'DISABLED'::"public"."PromotionStatus" END;

CREATE TABLE "public"."PromotionBranchRestriction" (
  "promotionId" UUID NOT NULL,
  "branchId" UUID NOT NULL,
  CONSTRAINT "PromotionBranchRestriction_pkey" PRIMARY KEY ("promotionId", "branchId"),
  CONSTRAINT "PromotionBranchRestriction_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "public"."Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PromotionBranchRestriction_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PromotionBranchRestriction_branchId_idx" ON "public"."PromotionBranchRestriction"("branchId");

CREATE TABLE "public"."PromotionAreaRestriction" (
  "promotionId" UUID NOT NULL,
  "areaId" UUID NOT NULL,
  CONSTRAINT "PromotionAreaRestriction_pkey" PRIMARY KEY ("promotionId", "areaId"),
  CONSTRAINT "PromotionAreaRestriction_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "public"."Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PromotionAreaRestriction_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "public"."Area"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PromotionAreaRestriction_areaId_idx" ON "public"."PromotionAreaRestriction"("areaId");
