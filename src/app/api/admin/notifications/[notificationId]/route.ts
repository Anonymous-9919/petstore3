import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";

export async function PATCH(_request: Request, context: { params: Promise<{ notificationId: string }> }) {
  const authorization = await authorizeAdminApi("notifications");
  if (!authorization.authorized) return authorization.response;
  const { notificationId } = await context.params;
  const result = await db.notification.updateMany({ where: { id: notificationId, userId: authorization.user.id, readAt: null }, data: { readAt: new Date() } });
  if (!result.count) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
