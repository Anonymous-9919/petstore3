import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";

const optionalText = z.string().trim().max(500).nullable();
const settingsSchema = z.object({ name: z.string().trim().min(1).max(200), nameAr: z.string().trim().min(1).max(200), slogan: optionalText, sloganAr: optionalText, currencyCode: z.string().trim().min(1).max(10), currencyLabel: z.string().trim().min(1).max(20), currencyLabelAr: z.string().trim().min(1).max(20), currencyDecimals: z.number().int().min(0).max(6), deliveryEnabled: z.boolean(), pickupEnabled: z.boolean(), email: z.string().trim().email().max(320).nullable(), phone: optionalText, whatsapp: optionalText });
export async function GET() { const authorization = await authorizeAdminApi("settings"); if (!authorization.authorized) return authorization.response; return NextResponse.json(await db.storeSetting.findUnique({ where: { id: "default" } })); }
export async function PATCH(request: Request) {
  const authorization = await authorizeAdminApi("settings"); if (!authorization.authorized) return authorization.response; const user = authorization.user;
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid store settings." }, { status: 400 });
  const before = await db.storeSetting.findUnique({ where: { id: "default" } });
  const setting = await db.storeSetting.upsert({ where: { id: "default" }, create: { id: "default", ...parsed.data }, update: parsed.data });
  await db.auditLog.create({ data: { actorId: user.id, action: "store.settings.updated", entityType: "storeSetting", entityId: setting.id, before: before ? { name: before.name, nameAr: before.nameAr, slogan: before.slogan, sloganAr: before.sloganAr, currencyCode: before.currencyCode, currencyLabel: before.currencyLabel, currencyLabelAr: before.currencyLabelAr, currencyDecimals: before.currencyDecimals, deliveryEnabled: before.deliveryEnabled, pickupEnabled: before.pickupEnabled, email: before.email, phone: before.phone, whatsapp: before.whatsapp } : undefined, after: parsed.data } });
  return NextResponse.json(setting);
}
