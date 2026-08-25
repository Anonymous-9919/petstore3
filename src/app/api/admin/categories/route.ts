import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { revalidateStorefrontCatalog } from "@/server/catalog-cache";
import { categoryInputSchema } from "@/server/validation/catalog";

export async function GET() {
  const authorization = await authorizeAdminApi("catalog", "read");
  if (!authorization.authorized) return authorization.response;
  const categories = await db.category.findMany({ orderBy: [{ archivedAt: "asc" }, { sortOrder: "asc" }], include: { _count: { select: { products: true } } } });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const authorization = await authorizeAdminApi("catalog");
  if (!authorization.authorized) return authorization.response;
  const parsed = categoryInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid category." }, { status: 400 });
  try {
    const category = await db.$transaction(async (tx) => {
      const created = await tx.category.create({ data: parsed.data });
      await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "catalog.category_created", entityType: "category", entityId: created.id, after: parsed.data } });
      return created;
    });
    revalidateStorefrontCatalog();
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A category with that slug already exists." }, { status: 409 });
  }
}
