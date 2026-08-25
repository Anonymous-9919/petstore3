import { NextResponse } from "next/server";
import { currentCustomer } from "@/server/auth";
import { db } from "@/server/db";

export const runtime = "nodejs";

export async function GET() {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: "Sign in to view your orders." }, { status: 401 });
  const orders = await db.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true, status: true, paymentStatus: true, total: true, currencyCode: true, createdAt: true, items: { select: { productName: true, productNameAr: true, quantity: true }, take: 3 } },
  });
  return NextResponse.json(orders.map((order) => ({ ...order, total: order.total.toString() })));
}
