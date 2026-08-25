import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { errorsCsv, type ImportError } from "@/server/services/product-import";

type Params = { params: Promise<{ jobId: string }> };
export async function GET(_request: Request, { params }: Params) {
  const authorization = await authorizeAdminApi("catalog", "read");
  if (!authorization.authorized) return authorization.response;
  const job = await db.productImportJob.findUnique({ where: { id: (await params).jobId }, select: { errors: true } });
  if (!job) return Response.json({ error: "Import job was not found." }, { status: 404 });
  return new Response(errorsCsv((job.errors as ImportError[] | null) ?? []), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=product-import-errors.csv", "Cache-Control": "no-store" } });
}
