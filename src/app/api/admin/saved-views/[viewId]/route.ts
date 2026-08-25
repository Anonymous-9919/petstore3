import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";

const paramsSchema = z.object({ viewId: z.string().uuid() });

export async function DELETE(_request: Request, context: { params: Promise<{ viewId: string }> }) {
  const authorization = await authorizeAdminApi("catalog");
  if (!authorization.authorized) return authorization.response;
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return NextResponse.json({ error: "Invalid saved view." }, { status: 400 });
  const result = await db.savedView.deleteMany({ where: { id: parsed.data.viewId, userId: authorization.user.id, resource: "products" } });
  if (!result.count) return NextResponse.json({ error: "Saved view not found." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
