-- Phase 6 storefront content is additive. Existing visible banners remain active.
ALTER TABLE "public"."StoreAsset"
  ADD COLUMN "mobilePath" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "startsAt" TIMESTAMPTZ(6),
  ADD COLUMN "endsAt" TIMESTAMPTZ(6);

UPDATE "public"."StoreAsset" SET "status" = 'ACTIVE' WHERE "isActive" = true;

DROP INDEX IF EXISTS "public"."StoreAsset_kind_sortOrder_key";
CREATE INDEX "StoreAsset_kind_sortOrder_createdAt_idx" ON "public"."StoreAsset"("kind", "sortOrder", "createdAt");

ALTER TABLE "public"."StoreSetting"
  ADD COLUMN "announcementEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "announcementText" TEXT,
  ADD COLUMN "announcementTextAr" TEXT,
  ADD COLUMN "announcementCtaLabel" TEXT,
  ADD COLUMN "announcementCtaLabelAr" TEXT,
  ADD COLUMN "announcementCtaUrl" TEXT,
  ADD COLUMN "announcementStartsAt" TIMESTAMPTZ(6),
  ADD COLUMN "announcementEndsAt" TIMESTAMPTZ(6);
