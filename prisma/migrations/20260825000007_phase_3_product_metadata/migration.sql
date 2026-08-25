-- Additive Phase 3 catalog metadata. This migration is intentionally not deployed here.
ALTER TABLE "Product"
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "seoTitle" TEXT,
  ADD COLUMN "seoTitleAr" TEXT,
  ADD COLUMN "seoDescription" TEXT,
  ADD COLUMN "seoDescriptionAr" TEXT;

CREATE INDEX "Product_brand_idx" ON "Product"("brand");
