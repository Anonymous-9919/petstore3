import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { revalidateStorefrontCatalog } from "@/server/catalog-cache";
import { productInputSchema, productListQuerySchema } from "@/server/validation/catalog";

export async function GET(request: Request) {
  const authorization = await authorizeAdminApi("catalog", "read");
  if (!authorization.authorized) return authorization.response;
  const parsed = productListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid product list query." }, { status: 400 });
  const { page, pageSize, query, status, archived, stock, categoryId, sort, direction } = parsed.data;
  const where = {
    ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { nameAr: { contains: query, mode: "insensitive" as const } }, { slug: { contains: query, mode: "insensitive" as const } }, { sku: { contains: query, mode: "insensitive" as const } }] } : {}),
    ...(status === "all" ? {} : { isActive: status === "active" }),
    ...(archived === "all" ? {} : { archivedAt: archived === "archived" ? { not: null } : null }),
    ...(categoryId ? { categoryId } : {}),
    // A product is available when any branch/variant level has unreserved units.
    ...(stock === "all" ? {} : { inventoryLevels: stock === "in-stock" ? { some: { quantity: { gt: db.inventoryLevel.fields.reserved } } } : { none: { quantity: { gt: db.inventoryLevel.fields.reserved } } } }),
  };
  const [products, total] = await Promise.all([
    db.product.findMany({ where, orderBy: [{ [sort]: direction }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize, include: { category: { select: { name: true, nameAr: true } } } }),
    db.product.count({ where }),
  ]);
  return NextResponse.json({ products, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

export async function POST(request: Request) {
  const authorization = await authorizeAdminApi("catalog");
  if (!authorization.authorized) return authorization.response;
  const parsed = productInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid product." }, { status: 400 });
  try {
    // New products always have a default variant and an independent stock row at every branch.
    const product = await db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: { ...parsed.data, variants: { create: { sku: parsed.data.sku, price: parsed.data.basePrice, compareAtPrice: parsed.data.compareAtPrice, isDefault: true, isActive: parsed.data.isActive } } },
        include: { variants: { where: { isDefault: true }, select: { id: true } } },
      });
      const branches = await tx.branch.findMany({ select: { id: true } });
      await tx.inventoryLevel.createMany({ data: branches.map((branch) => ({ branchId: branch.id, productId: created.id, variantId: created.variants[0].id })) });
      await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "catalog.product_created", entityType: "product", entityId: created.id, after: parsed.data } });
      return created;
    });
    revalidateStorefrontCatalog();
    return NextResponse.json(product, { status: 201 });
  }
  catch { return NextResponse.json({ error: "The category does not exist, or the slug or SKU is already used." }, { status: 409 }); }
}
