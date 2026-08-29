"use client";

import { useLang } from "@/lib/state";

type Announcement = { announcementText: string | null; announcementTextAr: string | null; announcementCtaLabel: string | null; announcementCtaLabelAr: string | null; announcementCtaUrl: string | null };

export function AnnouncementBar({ announcement }: { announcement: Announcement | null }) {
  const lang = useLang((state) => state.lang);
  if (!announcement) return null;
  const ar = lang === "ar";
  const text = ar ? announcement.announcementTextAr || announcement.announcementText : announcement.announcementText || announcement.announcementTextAr;
  const label = ar ? announcement.announcementCtaLabelAr || announcement.announcementCtaLabel : announcement.announcementCtaLabel || announcement.announcementCtaLabelAr;
  if (!text) return null;
  return <div className="bg-brand px-3 py-2 text-center text-sm font-medium text-white">{text}{announcement.announcementCtaUrl && label ? <> <a href={announcement.announcementCtaUrl} className="underline underline-offset-2">{label}</a></> : null}</div>;
}
