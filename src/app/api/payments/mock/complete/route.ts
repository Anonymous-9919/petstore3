import { NextResponse } from "next/server";
import { z } from "zod";
import { settleKnetPayment } from "@/server/services/payments";
import { db } from "@/server/db";

const schema = z.object({ orderId: z.string().uuid(), trackingToken: z.string().min(24) });

export async function POST(request: Request) {
  if (process.env.ALLOW_MOCK_PAYMENTS !== "true") return NextResponse.json({ error: "Mock payments are disabled." }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
  const order = await db.order.findFirst({
    where: { id: parsed.data.orderId, trackingToken: parsed.data.trackingToken, paymentMethod: "KNET" },
    include: { payments: { where: { provider: "mock-knet", method: "KNET" }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const payment = order?.payments[0];
  if (!order || !payment) return NextResponse.json({ error: "Payment is unavailable." }, { status: 409 });
  const providerReference = `mock-knet:${payment.id}`;
  try {
    const settled = await settleKnetPayment({
      trackId: payment.merchantTrackId,
      outcome: "CAPTURED",
      context: {
        paymentId: payment.id,
        orderId: order.id,
        trackingToken: parsed.data.trackingToken,
        provider: "mock-knet",
        amount: payment.amount.toFixed(3),
        currencyCode: payment.currencyCode,
        providerReference,
      },
      payload: {
        provider: "mock-knet",
        result: "CAPTURED",
        trackid: payment.merchantTrackId,
        udf1: payment.merchantTrackId,
        amt: payment.amount.toFixed(3),
        currencyCode: payment.currencyCode,
        paymentId: providerReference,
      },
    });
    return NextResponse.json({ orderNumber: settled.orderNumber, trackingToken: settled.trackingToken });
  } catch {
    return NextResponse.json({ error: "Unable to complete payment." }, { status: 409 });
  }
}
