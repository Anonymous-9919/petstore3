import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";

const consumingStatuses = [OrderStatus.NEW, OrderStatus.ASSIGNED_TO_BRANCH, OrderStatus.ASSIGNED_TO_DRIVER, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.REFUND_REQUESTED, OrderStatus.REFUNDED];

// Redemption rows are created with the order transaction, so this never infers usage from codes or order totals.
export async function GET() {
  const authorization = await authorizeAdminApi("marketing", "read");
  if (!authorization.authorized) return authorization.response;
  const rows = await db.promotionRedemption.groupBy({
    by: ["promotionId"],
    where: { order: { status: { in: consumingStatuses } } },
    _count: { _all: true },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });
  const promotions = rows.length ? await db.promotion.findMany({ where: { id: { in: rows.map((row) => row.promotionId) } }, select: { id: true, name: true, nameAr: true, code: true, benefit: true, status: true } }) : [];
  const names = new Map(promotions.map((promotion) => [promotion.id, promotion]));
  return NextResponse.json({ analytics: rows.map((row) => ({ ...names.get(row.promotionId), promotionId: row.promotionId, redemptions: row._count._all, discountTotal: row._sum.amount ?? 0 })) }, { headers: { "Cache-Control": "no-store" } });
}
