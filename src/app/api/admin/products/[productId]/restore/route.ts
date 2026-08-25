import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { revalidateStorefrontCatalog } from "@/server/catalog-cache";
import { db } from "@/server/db";

export async function POST(_request: Request, context: { params: Promise<{ productId: string }> }) {
  const authorization = await authorizeAdminApi("catalog");
  if (!authorization.authorized) return authorization.response;
  const { productId } = await context.params;
  try {
    const product = await db.$transaction(async (tx) => {
      const before = await tx.product.findUnique({ where: { id: productId }, select: { isActive: true, archivedAt: true } });
      if (!before) throw new Error("PRODUCT_NOT_FOUND");
      const updated = await tx.product.update({ where: { id: productId }, data: { archivedAt: null, isActive: true } });
      await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "catalog.product_restored", entityType: "product", entityId: productId, before, after: { isActive: true, archivedAt: null } } });
      return updated;
    });
    revalidateStorefrontCatalog();
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
}
