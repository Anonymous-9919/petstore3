import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { revalidateStorefrontPopups } from "@/server/catalog-cache";
import { db } from "@/server/db";
import { popupInputSchema } from "@/server/validation/popup";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ popupId: string }> }) {
  const authorization = await authorizeAdminApi("marketing");
  if (!authorization.authorized) return authorization.response;
  const parsed = popupInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid popup." }, { status: 400 });
  const { popupId } = await params;
  const previous = await db.popup.findUnique({ where: { id: popupId } });
  if (!previous) return NextResponse.json({ error: "Popup not found." }, { status: 404 });
  const popup = await db.$transaction(async (tx) => {
    const updated = await tx.popup.update({ where: { id: popupId }, data: parsed.data });
    await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "popup.updated", entityType: "popup", entityId: popupId, before: { name: previous.name, status: previous.status, isEnabled: previous.isEnabled }, after: { name: updated.name, status: updated.status, isEnabled: updated.isEnabled } } });
    return updated;
  });
  revalidateStorefrontPopups();
  return NextResponse.json(popup);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ popupId: string }> }) {
  const authorization = await authorizeAdminApi("marketing");
  if (!authorization.authorized) return authorization.response;
  const { popupId } = await params;
  const popup = await db.popup.findUnique({ where: { id: popupId } });
  if (!popup) return NextResponse.json({ error: "Popup not found." }, { status: 404 });
  await db.$transaction(async (tx) => {
    await tx.popup.update({ where: { id: popupId }, data: { status: "ARCHIVED", isEnabled: false } });
    await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "popup.archived", entityType: "popup", entityId: popupId, before: { status: popup.status, isEnabled: popup.isEnabled }, after: { status: "ARCHIVED", isEnabled: false } } });
  });
  revalidateStorefrontPopups();
  return new NextResponse(null, { status: 204 });
}
