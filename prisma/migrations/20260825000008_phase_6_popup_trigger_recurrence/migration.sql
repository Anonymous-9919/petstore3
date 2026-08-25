-- Additive Phase 6 popup trigger and recurrence controls. Do not deploy automatically.
ALTER TYPE "public"."PopupFrequency" ADD VALUE IF NOT EXISTS 'ONCE_PER_X_DAYS';
CREATE TYPE "public"."PopupTrigger" AS ENUM ('DELAY', 'SCROLL', 'EXIT_INTENT');

ALTER TABLE "public"."Popup"
  ADD COLUMN "trigger" "public"."PopupTrigger" NOT NULL DEFAULT 'DELAY',
  ADD COLUMN "scrollPercentage" INTEGER,
  ADD COLUMN "frequencyDays" INTEGER;

ALTER TABLE "public"."Popup"
  ADD CONSTRAINT "Popup_scrollPercentage_check" CHECK ("scrollPercentage" IS NULL OR "scrollPercentage" BETWEEN 1 AND 100),
  ADD CONSTRAINT "Popup_frequencyDays_check" CHECK ("frequencyDays" IS NULL OR "frequencyDays" >= 1);
