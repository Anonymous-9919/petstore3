import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { revalidateStorefrontPopups } from "@/server/catalog-cache";
import { db } from "@/server/db";
import { popupInputSchema } from "@/server/validation/popup";

export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await authorizeAdminApi("marketing", "read");
  if (!authorization.authorized) return authorization.response;
  const popups = await db.popup.findMany({ orderBy: { updatedAt: "desc" }, include: { _count: { select: { events: true } } } });
  return NextResponse.json(popups, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const authorization = await authorizeAdminApi("marketing");
  if (!authorization.authorized) return authorization.response;
  const parsed = popupInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid popup." }, { status: 400 });
  const popup = await db.$transaction(async (tx) => {
    const created = await tx.popup.create({ data: { ...parsed.data, createdById: authorization.user.id } });
    await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "popup.created", entityType: "popup", entityId: created.id, after: { name: created.name, status: created.status } } });
    return created;
  });
  revalidateStorefrontPopups();
  return NextResponse.json(popup, { status: 201 });
}
