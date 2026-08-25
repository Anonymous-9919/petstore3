-- Phase 6 popup marketing is additive; do not deploy this migration automatically.
CREATE TYPE "public"."PopupStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "public"."PopupPageTarget" AS ENUM ('ALL', 'HOME', 'CATEGORY', 'PRODUCT', 'CART');
CREATE TYPE "public"."PopupDevice" AS ENUM ('ALL', 'DESKTOP', 'MOBILE');
CREATE TYPE "public"."PopupFrequency" AS ENUM ('EVERY_VISIT', 'ONCE_PER_SESSION', 'ONCE_PER_DAY');
CREATE TYPE "public"."PopupEventType" AS ENUM ('IMPRESSION', 'CLICK');

CREATE TABLE "public"."Popup" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "body" TEXT,
  "bodyAr" TEXT,
  "imagePath" TEXT,
  "ctaLabel" TEXT,
  "ctaLabelAr" TEXT,
  "ctaUrl" TEXT,
  "couponCode" TEXT,
  "status" "public"."PopupStatus" NOT NULL DEFAULT 'DRAFT',
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "pageTarget" "public"."PopupPageTarget" NOT NULL DEFAULT 'ALL',
  "delaySeconds" INTEGER NOT NULL DEFAULT 0,
  "device" "public"."PopupDevice" NOT NULL DEFAULT 'ALL',
  "frequency" "public"."PopupFrequency" NOT NULL DEFAULT 'ONCE_PER_SESSION',
  "startsAt" TIMESTAMPTZ(6),
  "endsAt" TIMESTAMPTZ(6),
  "createdById" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "Popup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Popup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "public"."PopupEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "popupId" UUID NOT NULL,
  "type" "public"."PopupEventType" NOT NULL,
  "pageTarget" "public"."PopupPageTarget" NOT NULL,
  "device" "public"."PopupDevice" NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PopupEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PopupEvent_popupId_fkey" FOREIGN KEY ("popupId") REFERENCES "public"."Popup"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Popup_status_isEnabled_startsAt_endsAt_idx" ON "public"."Popup"("status", "isEnabled", "startsAt", "endsAt");
CREATE INDEX "Popup_pageTarget_status_idx" ON "public"."Popup"("pageTarget", "status");
CREATE INDEX "PopupEvent_popupId_type_createdAt_idx" ON "public"."PopupEvent"("popupId", "type", "createdAt");
