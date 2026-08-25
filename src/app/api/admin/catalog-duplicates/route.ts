import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { findDuplicateGroups } from "@/server/services/catalog-duplicates";

const productSelect = { id: true, legacyId: true, categoryId: true, sku: true, name: true, nameAr: true, basePrice: true, primaryImagePath: true, slug: true, createdAt: true, category: { select: { name: true, nameAr: true } } } as const;

export async function GET() {
  const authorization = await authorizeAdminApi("catalog", "read");
  if (!authorization.authorized) return authorization.response;
  const products = await db.product.findMany({ where: { isActive: true, archivedAt: null }, select: productSelect });
  const groups = findDuplicateGroups(products).map((group) => ({ key: group.key, match: group.match, canonical: group.canonical, duplicates: group.duplicates }));
  return NextResponse.json({ groups });
}
