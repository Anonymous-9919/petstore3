import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { promotionTemplates } from "@/server/promotions";

export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await authorizeAdminApi("marketing", "read");
  if (!authorization.authorized) return authorization.response;
  return NextResponse.json({ templates: promotionTemplates }, { headers: { "Cache-Control": "no-store" } });
}
