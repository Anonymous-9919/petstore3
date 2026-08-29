import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";

// Redemption rows are created with the order transaction, so this never infers usage from codes or order totals.
export async function GET() {
  const authorization = await authorizeAdminApi("marketing", "read");
  if (!authorization.authorized) return authorization.response;
  const rows = await db.$queryRaw<Array<{ promotionId: string; redemptions: bigint; discountTotal: string; orders: bigint; attributedRevenue: string }>>`
    SELECT r."promotionId", COUNT(r.id) AS redemptions, COALESCE(SUM(r.amount), 0)::text AS "discountTotal", COUNT(DISTINCT o.id) AS orders, COALESCE(SUM(o.total), 0)::text AS "attributedRevenue"
    FROM "PromotionRedemption" r
    JOIN "Order" o ON o.id = r."orderId"
    WHERE o.status IN ('NEW', 'ASSIGNED_TO_BRANCH', 'ASSIGNED_TO_DRIVER', 'OUT_FOR_DELIVERY', 'DELIVERED', 'REFUND_REQUESTED', 'REFUNDED')
    GROUP BY r."promotionId"
    ORDER BY COALESCE(SUM(r.amount), 0) DESC, r."promotionId" ASC`;
  const promotions = rows.length ? await db.promotion.findMany({ where: { id: { in: rows.map((row) => row.promotionId) } }, select: { id: true, name: true, nameAr: true, code: true, benefit: true, status: true } }) : [];
  const names = new Map(promotions.map((promotion) => [promotion.id, promotion]));
  return NextResponse.json({ analytics: rows.map((row) => {
    const orders = Number(row.orders);
    const revenue = Number(row.attributedRevenue);
    return { ...names.get(row.promotionId), promotionId: row.promotionId, redemptions: Number(row.redemptions), orders, discountTotal: row.discountTotal, attributedRevenue: row.attributedRevenue, averageOrderValue: orders ? (revenue / orders).toFixed(3) : "0.000" };
  }) }, { headers: { "Cache-Control": "no-store" } });
}
