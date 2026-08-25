import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { revalidateStorefrontContent } from "@/server/catalog-cache";

const optionalText = z.string().trim().max(500).nullable();
const url = z.string().trim().max(2_000).nullable().refine((value) => !value || /^https?:\/\//.test(value) || value.startsWith("/"), "CTA URL must be an absolute HTTP(S) or site-relative URL.");
const schema = z.object({ enabled: z.boolean(), text: optionalText, textAr: optionalText, ctaLabel: optionalText, ctaLabelAr: optionalText, ctaUrl: url, startsAt: z.coerce.date().nullable(), endsAt: z.coerce.date().nullable() }).superRefine((value, context) => {
  if (value.enabled && !value.text && !value.textAr) context.addIssue({ code: "custom", path: ["text"], message: "Provide English or Arabic announcement text." });
  if (value.startsAt && value.endsAt && value.startsAt >= value.endsAt) context.addIssue({ code: "custom", path: ["endsAt"], message: "End time must be after start time." });
});

export async function GET() {
  const authorization = await authorizeAdminApi("homepage");
  if (!authorization.authorized) return authorization.response;
  return NextResponse.json(await db.storeSetting.findUnique({ where: { id: "default" }, select: { announcementEnabled: true, announcementText: true, announcementTextAr: true, announcementCtaLabel: true, announcementCtaLabelAr: true, announcementCtaUrl: true, announcementStartsAt: true, announcementEndsAt: true } }));
}

export async function PATCH(request: Request) {
  const authorization = await authorizeAdminApi("homepage");
  if (!authorization.authorized) return authorization.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid announcement." }, { status: 400 });
  const data = { announcementEnabled: parsed.data.enabled, announcementText: parsed.data.text, announcementTextAr: parsed.data.textAr, announcementCtaLabel: parsed.data.ctaLabel, announcementCtaLabelAr: parsed.data.ctaLabelAr, announcementCtaUrl: parsed.data.ctaUrl, announcementStartsAt: parsed.data.startsAt, announcementEndsAt: parsed.data.endsAt };
  const announcement = await db.$transaction(async (tx) => {
    const before = await tx.storeSetting.findUnique({ where: { id: "default" } });
    if (!before) return null;
    const updated = await tx.storeSetting.update({ where: { id: "default" }, data });
    await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "store.announcement.updated", entityType: "storeSetting", entityId: updated.id, before: { announcementEnabled: before.announcementEnabled, announcementText: before.announcementText, announcementTextAr: before.announcementTextAr, announcementCtaLabel: before.announcementCtaLabel, announcementCtaLabelAr: before.announcementCtaLabelAr, announcementCtaUrl: before.announcementCtaUrl, announcementStartsAt: before.announcementStartsAt, announcementEndsAt: before.announcementEndsAt }, after: data } });
    return updated;
  });
  if (!announcement) return NextResponse.json({ error: "Store settings must be configured before adding an announcement." }, { status: 409 });
  revalidateStorefrontContent();
  return NextResponse.json(announcement);
}
