import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { promotionInputSchema } from "@/server/validation/promotion";

export const dynamic = "force-dynamic";

export async function hasValidPromotionProducts(ids: string[]) {
  if (!ids.length) return true;
  const products = await db.product.count({ where: { id: { in: ids }, isActive: true, archivedAt: null } });
  return products === new Set(ids).size;
}

export async function GET(request: Request) {
  const authorization = await authorizeAdminApi("marketing", "read");
  if (!authorization.authorized) return authorization.response;
  const params = new URL(request.url).searchParams;
  const requestedPage = Number(params.get("page") ?? 1);
  const requestedPageSize = Number(params.get("pageSize") ?? 25);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 10_000) : 1;
  const pageSize = Number.isSafeInteger(requestedPageSize) && requestedPageSize > 0 ? Math.min(requestedPageSize, 100) : 25;
  const [promotions, total] = await Promise.all([
    db.promotion.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { targets: { include: { product: { select: { id: true, name: true, nameAr: true } }, category: { select: { id: true, name: true, nameAr: true } } } }, branchRestrictions: { include: { branch: { select: { id: true, name: true } } } }, areaRestrictions: { include: { area: { select: { id: true, name: true } } } } },
    }),
    db.promotion.count(),
  ]);
  return NextResponse.json({ promotions, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const authorization = await authorizeAdminApi("marketing");
  if (!authorization.authorized) return authorization.response;
  const parsed = promotionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid promotion." }, { status: 400 });
  if (!await hasValidPromotionProducts([...parsed.data.qualifyingProductIds, ...parsed.data.rewardProductIds])) return NextResponse.json({ error: "Promotion qualifying and reward products must be active products." }, { status: 400 });
  const { targetIds, branchIds, areaIds, scope, ...data } = parsed.data;
  try {
    const promotion = await db.promotion.create({
      data: {
        ...data,
        scope,
        targets: targetIds.length ? { create: targetIds.map((id) => scope === "PRODUCT" ? { productId: id } : { categoryId: id }) } : undefined,
        branchRestrictions: branchIds.length ? { create: branchIds.map((branchId) => ({ branchId })) } : undefined,
        areaRestrictions: areaIds.length ? { create: areaIds.map((areaId) => ({ areaId })) } : undefined,
      },
      include: { targets: true },
    });
    return NextResponse.json(promotion, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create promotion. The code may already exist or a target is invalid." }, { status: 409 });
  }
}
