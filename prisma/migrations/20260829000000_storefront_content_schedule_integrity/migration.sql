ALTER TABLE "public"."StoreAsset"
  ADD CONSTRAINT "StoreAsset_schedule_check" CHECK ("endsAt" IS NULL OR "startsAt" IS NULL OR "endsAt" > "startsAt");

ALTER TABLE "public"."StoreSetting"
  ADD CONSTRAINT "StoreSetting_announcement_schedule_check" CHECK ("announcementEndsAt" IS NULL OR "announcementStartsAt" IS NULL OR "announcementEndsAt" > "announcementStartsAt");

ALTER TABLE "public"."Popup"
  ADD CONSTRAINT "Popup_schedule_check" CHECK ("endsAt" IS NULL OR "startsAt" IS NULL OR "endsAt" > "startsAt");
