import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { templateCsv } from "@/server/services/product-import";

export async function GET() {
  const authorization = await authorizeAdminApi("catalog", "read");
  if (!authorization.authorized) return authorization.response;
  const branches = await db.branch.findMany({ orderBy: { name: "asc" }, select: { name: true } });
  return new Response(templateCsv(branches), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=product-import-template.csv", "Cache-Control": "no-store" } });
}
