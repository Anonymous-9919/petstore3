import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { revalidateStorefrontContent } from "@/server/catalog-cache";
import { bannerSchema, validateBannerCategory } from "../route";

const bannerKind = "HOMEPAGE_BANNER";

export async function PATCH(request: Request, { params }: { params: Promise<{ bannerId: string }> }) {
  const authorization = await authorizeAdminApi("homepage");
  if (!authorization.authorized) return authorization.response;
  const user = authorization.user;
  const parsed = bannerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid homepage banner." }, { status: 400 });
  const { bannerId } = await params;
  let banner;
  try {
    banner = await db.$transaction(async (tx) => {
      const before = await tx.storeAsset.findFirst({ where: { id: bannerId, kind: bannerKind } });
      if (!before) return null;
      await validateBannerCategory(tx, parsed.data);
      const updated = await tx.storeAsset.update({ where: { id: bannerId }, data: { ...parsed.data, isActive: parsed.data.status === "ACTIVE", archivedAt: parsed.data.status === "ARCHIVED" ? new Date() : null } });
      await tx.auditLog.create({ data: { actorId: user.id, action: "homepage.banner.updated", entityType: "storeAsset", entityId: updated.id, before, after: parsed.data } });
      return updated;
    });
  } catch { return NextResponse.json({ error: "Category banners require an active category." }, { status: 409 }); }
  if (!banner) return NextResponse.json({ error: "Homepage banner not found." }, { status: 404 });
  revalidateStorefrontContent();
  return NextResponse.json(banner);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ bannerId: string }> }) {
  const authorization = await authorizeAdminApi("homepage");
  if (!authorization.authorized) return authorization.response;
  const user = authorization.user;
  const { bannerId } = await params;
  const banner = await db.$transaction(async (tx) => {
    const before = await tx.storeAsset.findFirst({ where: { id: bannerId, kind: bannerKind } });
    if (!before) return null;
    await tx.storeAsset.update({ where: { id: bannerId }, data: { status: "ARCHIVED", isActive: false, archivedAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "homepage.banner.archived", entityType: "storeAsset", entityId: before.id, before } });
    return before;
  });
  if (!banner) return NextResponse.json({ error: "Homepage banner not found." }, { status: 404 });
  revalidateStorefrontContent();
  return new NextResponse(null, { status: 204 });
}
