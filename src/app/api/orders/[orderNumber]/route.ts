import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await context.params;
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Tracking token required." }, { status: 401 });
  const order = await db.order.findFirst({
    where: { orderNumber, trackingToken: token },
    select: { orderNumber: true, status: true, paymentStatus: true, total: true, currencyCode: true, createdAt: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ ...order, total: order.total.toString() });
}
