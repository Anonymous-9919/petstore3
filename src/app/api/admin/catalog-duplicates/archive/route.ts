import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { findDuplicateGroups } from "@/server/services/catalog-duplicates";

const inputSchema = z.object({ productId: z.string().uuid(), canonicalProductId: z.string().uuid() });
const duplicateSelect = { id: true, legacyId: true, categoryId: true, sku: true, name: true, nameAr: true, basePrice: true, primaryImagePath: true, slug: true, createdAt: true } as const;

export async function POST(request: Request) {
  const authorization = await authorizeAdminApi("catalog");
  if (!authorization.authorized) return authorization.response;
  const user = authorization.user;
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A product and canonical product are required." }, { status: 400 });
  if (parsed.data.productId === parsed.data.canonicalProductId) return NextResponse.json({ error: "The canonical product cannot be archived." }, { status: 400 });
  const result = await db.$transaction(async (tx) => {
    const products = await tx.product.findMany({ where: { isActive: true, archivedAt: null }, select: duplicateSelect });
    const group = findDuplicateGroups(products).find((candidate) => candidate.canonical.id === parsed.data.canonicalProductId && candidate.duplicates.some((product) => product.id === parsed.data.productId));
    if (!group) return null;
    const archivedAt = new Date();
    const product = await tx.product.update({ where: { id: parsed.data.productId }, data: { isActive: false, archivedAt } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "catalog.duplicate_archived", entityType: "product", entityId: product.id, before: { isActive: true, archivedAt: null, canonicalProductId: group.canonical.id, match: group.match }, after: { isActive: false, archivedAt: archivedAt.toISOString(), canonicalProductId: group.canonical.id } } });
    return product;
  });
  if (!result) return NextResponse.json({ error: "This product is no longer an active non-canonical member of the selected duplicate group." }, { status: 409 });
  return NextResponse.json(result);
}
