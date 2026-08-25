import { NextResponse } from "next/server";
import { currentCustomer } from "@/server/auth";
import { CheckoutError, createOrder } from "@/server/services/checkout";
import { checkoutRequestSchema } from "@/server/validation/checkout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = checkoutRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid order request." }, { status: 400 });
  try {
    const customer = await currentCustomer();
    const order = await createOrder(parsed.data, customer?.id);
    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      trackingToken: order.trackingToken,
      payment: { id: order.payments[0].id, method: order.paymentMethod, status: order.paymentStatus },
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof CheckoutError ? error.message : "Unable to create the order." }, { status: 400 });
  }
}
