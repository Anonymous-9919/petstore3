import { NextResponse } from "next/server";
import { z } from "zod";
import { currentCustomer } from "@/server/auth";
import { db } from "@/server/db";

export const runtime = "nodejs";
const productSchema = z.object({ productSlug: z.string().trim().min(1).max(200) });

export async function GET() {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ ids: [] });
  const items = await db.wishlistItem.findMany({ where: { customerId: customer.id }, select: { product: { select: { legacyId: true } } } });
  return NextResponse.json({ ids: items.flatMap((item) => item.product.legacyId === null ? [] : [item.product.legacyId]) });
}

export async function POST(request: Request) {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: "Sign in to save favorites." }, { status: 401 });
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  const product = await db.product.findUnique({ where: { slug: parsed.data.productSlug }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  await db.wishlistItem.upsert({ where: { customerId_productId: { customerId: customer.id, productId: product.id } }, create: { customerId: customer.id, productId: product.id }, update: {} });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: "Sign in to manage favorites." }, { status: 401 });
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  await db.wishlistItem.deleteMany({ where: { customerId: customer.id, product: { slug: parsed.data.productSlug } } });
  return NextResponse.json({ ok: true });
}
