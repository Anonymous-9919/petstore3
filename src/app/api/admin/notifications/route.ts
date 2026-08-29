import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";

export async function GET(request: Request) {
  const authorization = await authorizeAdminApi("notifications", "read");
  if (!authorization.authorized) return authorization.response;
  const params = new URL(request.url).searchParams;
  const boundedInteger = (value: string | null, fallback: number, maximum: number) => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
  };
  const page = boundedInteger(params.get("page"), 1, 10_000);
  const pageSize = boundedInteger(params.get("pageSize"), 20, 50);
  const where = { userId: authorization.user.id };
  const [notifications, total, unread] = await Promise.all([
    db.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, title: true, body: true, href: true, readAt: true, createdAt: true } }),
    db.notification.count({ where }),
    db.notification.count({ where: { ...where, readAt: null } }),
  ]);
  return NextResponse.json({ notifications, unread, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

export async function PATCH(request: Request) {
  const authorization = await authorizeAdminApi("notifications");
  if (!authorization.authorized) return authorization.response;
  const body = await request.json().catch(() => null);
  if (body?.action !== "mark-all-read") return NextResponse.json({ error: "Invalid notification action." }, { status: 400 });
  await db.notification.updateMany({ where: { userId: authorization.user.id, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
