import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { popupEventSchema } from "@/server/validation/popup";

export async function POST(request: Request) {
  const parsed = popupEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  const now = new Date();
  const popup = await db.popup.findFirst({ where: { id: parsed.data.popupId, status: "ACTIVE", isEnabled: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }], pageTarget: { in: ["ALL", parsed.data.pageTarget] }, device: { in: ["ALL", parsed.data.device] } }, select: { id: true } });
  if (!popup) return NextResponse.json({ error: "Popup not active." }, { status: 404 });
  await db.popupEvent.create({ data: parsed.data });
  return new NextResponse(null, { status: 204 });
}
