import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function POST(req: Request) {
  if (process.env.ALLOW_MOCK_PAYMENTS !== "true") {
    return NextResponse.json({ error: "Online payment is not configured." }, { status: 503 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      orderId?: unknown;
      trackingToken?: unknown;
      lang?: unknown;
    };
    if (typeof body.orderId !== "string" || typeof body.trackingToken !== "string") {
      return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
    }
    const order = await db.order.findFirst({
      where: { id: body.orderId, trackingToken: body.trackingToken, status: "NEW", paymentMethod: "KNET", paymentStatus: "PENDING" },
      include: {
        payments: { where: { provider: "mock-knet", method: "KNET", status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 1 },
        reservations: true,
      },
    });
    const payment = order?.payments[0];
    const now = new Date();
    if (
      !order ||
      !payment ||
      !payment.amount.equals(order.total) ||
      payment.currencyCode !== order.currencyCode ||
      order.reservations.length === 0 ||
      order.reservations.some((reservation) => reservation.status !== "ACTIVE" || reservation.expiresAt == null || reservation.expiresAt <= now)
    ) {
      return NextResponse.json({ error: "This payment is no longer available." }, { status: 409 });
    }
    const trackId = payment.merchantTrackId;
    const lang = body.lang === "ar" ? "AR" : "ENG";
    // Real KNET remains intentionally unreachable until signed callback or
    // server-inquiry verification is available. This route serves mock-knet only.
    const origin = new URL(req.url).origin;
    const sandboxUrl = `${origin}/checkout/sandbox?orderId=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.trackingToken)}&lang=${lang === "AR" ? "ar" : "en"}`;
    return NextResponse.json({ paymentUrl: sandboxUrl, trackId, sandbox: true });
  } catch {
    return NextResponse.json({ error: "Server error while initiating payment." }, { status: 500 });
  }
}
