import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";

export async function GET(request: Request) {
  const authorization = await authorizeAdminApi("governance");
  if (!authorization.authorized) return authorization.response;
  const params = new URL(request.url).searchParams;
  const boundedInteger = (value: string | null, fallback: number, maximum: number) => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
  };
  const page = boundedInteger(params.get("page"), 1, 10_000);
  const pageSize = boundedInteger(params.get("pageSize"), 25, 100);
  const [entries, total] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, action: true, entityType: true, entityId: true, createdAt: true, actor: { select: { name: true, email: true } } } }),
    db.auditLog.count(),
  ]);
  // Audit payloads can contain operationally sensitive fields, so this endpoint never exposes before/after JSON.
  return NextResponse.json({ entries, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}
