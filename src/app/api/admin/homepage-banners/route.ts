import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { revalidateStorefrontContent } from "@/server/catalog-cache";
import { bannerInputSchema } from "@/server/validation/storefront-content";

const bannerKind = "HOMEPAGE_BANNER";
export const bannerSchema = bannerInputSchema;

export async function validateBannerCategory(tx: { category: { findFirst: (args: { where: { id: string; isActive: boolean; archivedAt: null }; select: { id: boolean } }) => Promise<{ id: string } | null> } }, data: z.infer<typeof bannerSchema>) {
  if (data.placement !== "CATEGORY") return;
  const category = await tx.category.findFirst({ where: { id: data.categoryId!, isActive: true, archivedAt: null }, select: { id: true } });
  if (!category) throw new Error("CATEGORY_UNAVAILABLE");
}

export async function GET() {
  const authorization = await authorizeAdminApi("homepage");
  if (!authorization.authorized) return authorization.response;
  return NextResponse.json(await db.storeAsset.findMany({ where: { kind: bannerKind }, orderBy: [{ placement: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] }));
}

export async function POST(request: Request) {
  const authorization = await authorizeAdminApi("homepage");
  if (!authorization.authorized) return authorization.response;
  const user = authorization.user;
  const parsed = bannerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid homepage banner." }, { status: 400 });
  try {
    const banner = await db.$transaction(async (tx) => {
      await validateBannerCategory(tx, parsed.data);
      const created = await tx.storeAsset.create({ data: { kind: bannerKind, ...parsed.data, isActive: parsed.data.status === "ACTIVE", archivedAt: parsed.data.status === "ARCHIVED" ? new Date() : null } });
      await tx.auditLog.create({ data: { actorId: user.id, action: "homepage.banner.created", entityType: "storeAsset", entityId: created.id, after: parsed.data } });
      return created;
    });
    revalidateStorefrontContent();
    return NextResponse.json(banner, { status: 201 });
  } catch { return NextResponse.json({ error: "Category banners require an active category." }, { status: 409 }); }
}

export async function PUT(request: Request) {
  const authorization = await authorizeAdminApi("homepage");
  if (!authorization.authorized) return authorization.response;
  const parsed = z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int().min(0).max(10_000) })).min(1).max(100).safeParse(await request.json().catch(() => null));
  if (!parsed.success || new Set(parsed.data.map((item) => item.id)).size !== parsed.data.length) return NextResponse.json({ error: "Provide unique banner IDs and display orders." }, { status: 400 });
  const ids = parsed.data.map((item) => item.id);
  const result = await db.$transaction(async (tx) => {
    const banners = await tx.storeAsset.findMany({ where: { id: { in: ids }, kind: bannerKind }, select: { id: true } });
    if (banners.length !== ids.length) return false;
    await Promise.all(parsed.data.map((item) => tx.storeAsset.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })));
    await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "homepage.banner.reordered", entityType: "storeAsset", entityId: "homepage-banners", after: { order: parsed.data } } });
    return true;
  });
  if (!result) return NextResponse.json({ error: "One or more homepage banners were not found." }, { status: 404 });
  revalidateStorefrontContent();
  return NextResponse.json({ ok: true });
}
