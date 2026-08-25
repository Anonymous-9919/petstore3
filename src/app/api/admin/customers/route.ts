import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";

export async function GET(request: Request) {
  const authorization = await authorizeAdminApi("users");
  if (!authorization.authorized) return authorization.response;
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim();
  const requestedPage = Number(params.get("page") ?? 1);
  const requestedPageSize = Number(params.get("pageSize") ?? 50);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 10_000) : 1;
  const pageSize = Number.isSafeInteger(requestedPageSize) && requestedPageSize > 0 ? Math.min(requestedPageSize, 100) : 50;
  const where = query ? { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { email: { contains: query, mode: "insensitive" as const } }, { phone: { contains: query } }] } : undefined;
  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, email: true, phone: true, createdAt: true, user: { select: { status: true } }, _count: { select: { orders: true } } },
    }),
    db.customer.count({ where }),
  ]);
  return NextResponse.json({ customers, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}
