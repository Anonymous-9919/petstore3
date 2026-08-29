import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { revalidateStorefrontContent } from "@/server/catalog-cache";
import { announcementInputSchema } from "@/server/validation/storefront-content";

export async function GET() {
  const authorization = await authorizeAdminApi("homepage");
  if (!authorization.authorized) return authorization.response;
  return NextResponse.json(await db.storeSetting.findUnique({ where: { id: "default" }, select: { announcementEnabled: true, announcementText: true, announcementTextAr: true, announcementCtaLabel: true, announcementCtaLabelAr: true, announcementCtaUrl: true, announcementStartsAt: true, announcementEndsAt: true } }));
}

export async function PATCH(request: Request) {
  const authorization = await authorizeAdminApi("homepage");
  if (!authorization.authorized) return authorization.response;
  const parsed = announcementInputSchema.safeParse(await request.json().catch(() => null));
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
