import { NextResponse } from "next/server";
import { knetConfigured, knetInitiate, knetPaymentPage } from "@/lib/knet";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      amount?: unknown;
      trackId?: unknown;
      lang?: unknown;
    };
    const amount = typeof body.amount === "string" ? body.amount : String(body.amount ?? "");
    if (!/^\d+\.\d{3}$/.test(amount) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
    }
    const trackId =
      typeof body.trackId === "string" && /^[A-Za-z0-9-]+$/.test(body.trackId)
        ? body.trackId
        : `ORD${Date.now()}`;
    const lang = body.lang === "ar" ? "AR" : "ENG";
    if (!knetConfigured()) {
      // Sandbox mode: no real KNET credentials configured.
      // Hand the shopper off to a simulated gateway page so the full
      // confirmation -> gateway -> success round-trip can be tested.
      const origin = new URL(req.url).origin;
      const sandboxUrl = `${origin}/checkout/sandbox?trackId=${encodeURIComponent(trackId)}&lang=${lang === "AR" ? "ar" : "en"}`;
      return NextResponse.json({ paymentUrl: sandboxUrl, trackId, sandbox: true });
    }
    const result = await knetInitiate({ amount, trackId, lang, udf1: trackId });
    if (result.error || !result.paymentId) {
      return NextResponse.json(
        { error: result.error || "KNET could not initiate the payment." },
        { status: 502 }
      );
    }
    return NextResponse.json({
      paymentUrl: knetPaymentPage(result.paymentId),
      trackId,
    });
  } catch {
    return NextResponse.json({ error: "Server error while initiating payment." }, { status: 500 });
  }
}
