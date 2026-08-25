import { NextResponse } from "next/server";
import { currentCustomer } from "@/server/auth";
import { CheckoutError, quoteCheckout } from "@/server/services/checkout";
import { checkoutRequestSchema } from "@/server/validation/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = checkoutRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  try {
    const customer = await currentCustomer();
    const quote = await quoteCheckout(parsed.data, customer?.id);
    return NextResponse.json({
      branchId: quote.branch.legacyId,
      deliveryFee: quote.deliveryFee.toString(),
      subtotal: quote.subtotal.toString(),
      discountTotal: quote.discountTotal.toString(),
      total: quote.total.toString(),
      currency: "KWD",
      promotion: quote.promotion ? { code: quote.promotion.code, name: quote.promotion.name } : null,
      items: quote.lines.map((line) => ({ productId: line.product.legacyId, unitPrice: line.unitPrice.toString(), lineTotal: line.lineTotal.toString() })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof CheckoutError ? error.message : "Unable to quote checkout." }, { status: 400 });
  }
}
