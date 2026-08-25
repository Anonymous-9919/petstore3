import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { revalidateStorefrontCatalog } from "@/server/catalog-cache";
import { categoryInputSchema } from "@/server/validation/catalog";

export async function PATCH(request: Request, context: { params: Promise<{ categoryId: string }> }) {
  const authorization = await authorizeAdminApi("catalog");
  if (!authorization.authorized) return authorization.response;
  const parsed = categoryInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid category." }, { status: 400 });
  try {
    const { categoryId } = await context.params;
    const category = await db.$transaction(async (tx) => {
      const before = await tx.category.findUnique({ where: { id: categoryId }, select: { slug: true, name: true, nameAr: true, isActive: true, archivedAt: true } });
      if (!before) throw new Error("CATEGORY_NOT_FOUND");
      const updated = await tx.category.update({ where: { id: categoryId }, data: parsed.data });
      await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "catalog.category_updated", entityType: "category", entityId: categoryId, before, after: parsed.data } });
      return updated;
    });
    revalidateStorefrontCatalog();
    return NextResponse.json(category);
  } catch { return NextResponse.json({ error: "Category not found or slug already exists." }, { status: 409 }); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ categoryId: string }> }) {
  const authorization = await authorizeAdminApi("catalog");
  if (!authorization.authorized) return authorization.response;
  const { categoryId } = await context.params;
  try {
    const category = await db.$transaction(async (tx) => {
      const before = await tx.category.findUnique({ where: { id: categoryId }, select: { isActive: true, archivedAt: true } });
      if (!before) throw new Error("CATEGORY_NOT_FOUND");
      const updated = await tx.category.update({ where: { id: categoryId }, data: { isActive: false, archivedAt: new Date() } });
      await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "catalog.category_archived", entityType: "category", entityId: categoryId, before, after: { isActive: false, archivedAt: updated.archivedAt } } });
      return updated;
    });
    revalidateStorefrontCatalog();
    return NextResponse.json(category);
  }
  catch { return NextResponse.json({ error: "Category not found." }, { status: 404 }); }
}
