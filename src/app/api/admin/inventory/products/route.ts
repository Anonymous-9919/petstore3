import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";

const PAGE_SIZE = 25;

export async function GET(request: Request) {
  const authorization = await authorizeAdminApi("inventory", "read");
  if (!authorization.authorized) return authorization.response;

  const params = new URL(request.url).searchParams;
  const query = params.get("query")?.trim() ?? "";
  const rawPage = Number(params.get("page") ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10_000) : 1;
  if (query.length < 2 || query.length > 200) return NextResponse.json({ products: [], pagination: { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 } });

  const where = { archivedAt: null, OR: [{ name: { contains: query, mode: "insensitive" as const } }, { nameAr: { contains: query, mode: "insensitive" as const } }, { sku: { contains: query, mode: "insensitive" as const } }] };
  const [products, total] = await Promise.all([
    db.product.findMany({ where, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: { id: true, name: true, sku: true } }),
    db.product.count({ where }),
  ]);
  return NextResponse.json({ products, pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) } });
}
