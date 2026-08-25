import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { revalidateStorefrontContent } from "@/server/catalog-cache";

const bannerKind = "HOMEPAGE_BANNER";
const nullableText = z.string().trim().max(2_000).nullable();
export const bannerSchema = z.object({
  path: z.string().trim().min(1).max(2_000), mobilePath: nullableText, alt: z.string().trim().max(500).nullable(), altAr: z.string().trim().max(500).nullable(), sortOrder: z.number().int().min(0).max(10_000), status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]), placement: z.enum(["HOMEPAGE", "CATEGORY", "HERO"]).default("HOMEPAGE"), categoryId: z.string().uuid().nullable().default(null), startsAt: z.coerce.date().nullable(), endsAt: z.coerce.date().nullable(),
}).superRefine((value, context) => { if (value.startsAt && value.endsAt && value.startsAt >= value.endsAt) context.addIssue({ code: "custom", path: ["endsAt"], message: "End time must be after start time." }); if (value.placement === "CATEGORY" && !value.categoryId) context.addIssue({ code: "custom", path: ["categoryId"], message: "Category banners require a category ID." }); if (value.placement !== "CATEGORY" && value.categoryId) context.addIssue({ code: "custom", path: ["categoryId"], message: "Only category banners can have a category ID." }); });

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
  const banner = await db.$transaction(async (tx) => {
    const created = await tx.storeAsset.create({ data: { kind: bannerKind, ...parsed.data, isActive: parsed.data.status === "ACTIVE", archivedAt: parsed.data.status === "ARCHIVED" ? new Date() : null } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "homepage.banner.created", entityType: "storeAsset", entityId: created.id, after: parsed.data } });
    return created;
  });
  revalidateStorefrontContent();
  return NextResponse.json(banner, { status: 201 });
}

export async function PUT(request: Request) {
  const authorization = await authorizeAdminApi("homepage");
  if (!authorization.authorized) return authorization.response;
  const parsed = z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int().min(0).max(10_000) })).min(1).max(100).safeParse(await request.json().catch(() => null));
  if (!parsed.success || new Set(parsed.data.map((item) => item.id)).size !== parsed.data.length) return NextResponse.json({ error: "Provide unique banner IDs and display orders." }, { status: 400 });
  await db.$transaction(parsed.data.map((item) => db.storeAsset.updateMany({ where: { id: item.id, kind: bannerKind }, data: { sortOrder: item.sortOrder } })));
  revalidateStorefrontContent();
  return NextResponse.json({ ok: true });
}
