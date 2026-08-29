import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { cleanupStaleProductImportPreviews } from "@/server/services/product-import-preview-cleanup";

export async function POST() {
  const authorization = await authorizeAdminApi("catalog");
  if (!authorization.authorized) return authorization.response;
  if (authorization.user.role !== "OWNER" && authorization.user.role !== "MANAGER") return NextResponse.json({ error: "Only owners and managers can clean up import previews." }, { status: 403 });

  return NextResponse.json(await cleanupStaleProductImportPreviews());
}
