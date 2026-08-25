import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";

export async function GET(_request: Request, context: { params: Promise<{ customerId: string }> }) {
  const authorization = await authorizeAdminApi("users");
  if (!authorization.authorized) return authorization.response;
  const { customerId } = await context.params;
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    include: {
      user: { select: { email: true, status: true, createdAt: true } },
      addresses: { include: { area: { select: { name: true, province: { select: { name: true } } } } }, orderBy: { updatedAt: "desc" } },
      orders: { select: { id: true, orderNumber: true, status: true, total: true, currencyCode: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  return NextResponse.json(customer);
}
