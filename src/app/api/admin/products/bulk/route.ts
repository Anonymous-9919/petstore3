import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { revalidateStorefrontCatalog } from "@/server/catalog-cache";
import { productBulkActionSchema } from "@/server/validation/catalog";

export async function POST(request: Request) {
  const authorization = await authorizeAdminApi("catalog");
  if (!authorization.authorized) return authorization.response;
  const parsed = productBulkActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid bulk product action." }, { status: 400 });

  const { productIds, action, categoryId, basePrice, compareAtPrice, tags } = parsed.data;
  const data = action === "activate" ? { isActive: true, archivedAt: null }
    : action === "draft" ? { isActive: false }
      : action === "archive" ? { isActive: false, archivedAt: new Date() }
        : action === "restore" ? { isActive: true, archivedAt: null }
          : action === "category" ? { categoryId: categoryId! }
            : action === "price" ? { basePrice: basePrice!, compareAtPrice: compareAtPrice ?? null }
              : null;
  try {
    const result = await db.$transaction(async (tx) => {
      if (action === "category") {
        const category = await tx.category.findFirst({ where: { id: categoryId!, isActive: true, archivedAt: null }, select: { id: true } });
        if (!category) throw new Error("CATEGORY_UNAVAILABLE");
      }
      if (action === "tags") {
        const products = await tx.product.findMany({ where: { id: { in: productIds } }, select: { id: true, tags: true } });
        await Promise.all(products.map((product) => tx.product.update({ where: { id: product.id }, data: { tags: [...new Set([...product.tags, ...tags!].map((tag) => tag.toLowerCase()))] } })));
        await tx.auditLog.createMany({ data: products.map((product) => ({ actorId: authorization.user.id, action: "catalog.bulk_tags", entityType: "product", entityId: product.id, after: { tags } })) });
        return { count: products.length };
      }
      const updated = await tx.product.updateMany({ where: { id: { in: productIds } }, data: data! });
      if (action === "price") {
        // Checkout prices the default variant, while non-default variants may have intentional overrides.
        await tx.productVariant.updateMany({ where: { productId: { in: productIds }, isDefault: true }, data: { price: basePrice!, compareAtPrice: compareAtPrice ?? null } });
      }
      await tx.auditLog.createMany({ data: productIds.map((entityId) => ({ actorId: authorization.user.id, action: `catalog.bulk_${action}`, entityType: "product", entityId, after: data ?? {} })) });
      return updated;
    });
    revalidateStorefrontCatalog();
    return NextResponse.json({ updated: result.count });
  } catch {
    return NextResponse.json({ error: "Products could not be updated. Check the selected category and try again." }, { status: 409 });
  }
}
