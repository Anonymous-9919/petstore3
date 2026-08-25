import { NextResponse } from "next/server";
import { currentCustomer } from "@/server/auth";
import { db } from "@/server/db";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: "Sign in to track your order." }, { status: 401 });
  const { orderNumber } = await context.params;
  const order = await db.order.findFirst({
    where: { orderNumber, customerId: customer.id },
    select: { orderNumber: true, status: true, paymentStatus: true, total: true, currencyCode: true, createdAt: true, fulfillmentMode: true, scheduledStartAt: true, scheduledEndAt: true, statusHistory: { orderBy: { createdAt: "desc" }, select: { toStatus: true, note: true, createdAt: true } } },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ ...order, total: order.total.toString() });
}
