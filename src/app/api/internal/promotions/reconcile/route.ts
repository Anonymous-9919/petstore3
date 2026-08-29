import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { notifyStaff } from "@/server/notifications/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const now = new Date();
  const [toActivate, toExpire] = await Promise.all([
    db.promotion.findMany({ where: { status: "SCHEDULED", isActive: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] }, select: { id: true, name: true } }),
    db.promotion.findMany({ where: { status: { in: ["SCHEDULED", "ACTIVE"] }, isActive: true, endsAt: { lte: now } }, select: { id: true, name: true } }),
  ]);
  await Promise.all([
    toActivate.length ? db.promotion.updateMany({ where: { id: { in: toActivate.map(({ id }) => id) } }, data: { status: "ACTIVE" } }) : undefined,
    toExpire.length ? db.promotion.updateMany({ where: { id: { in: toExpire.map(({ id }) => id) } }, data: { status: "EXPIRED", isActive: false } }) : undefined,
  ]);
  await Promise.all([
    toActivate.length ? notifyStaff({ title: "Promotion started", body: `${toActivate.length} promotion${toActivate.length === 1 ? " is" : "s are"} now active: ${toActivate.map(({ name }) => name).join(", ")}.`, href: "/admin/promotions", roles: ["OWNER", "MANAGER", "CONTENT_MANAGER"] }) : undefined,
    toExpire.length ? notifyStaff({ title: "Promotion ended", body: `${toExpire.length} promotion${toExpire.length === 1 ? " has" : "s have"} ended: ${toExpire.map(({ name }) => name).join(", ")}.`, href: "/admin/promotions", roles: ["OWNER", "MANAGER", "CONTENT_MANAGER"] }) : undefined,
  ]);
  return NextResponse.json({ activated: toActivate.length, expired: toExpire.length });
}
