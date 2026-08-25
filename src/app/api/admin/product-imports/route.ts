import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { importModes, previewImport, MAX_IMPORT_BYTES, type ImportMode } from "@/server/services/product-import";

async function requestPayload(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMPORT_BYTES + 20_000) throw new Error("CSV must be 5 MB or smaller.");
  if (request.headers.get("content-type")?.includes("text/csv")) return { csv: await request.text(), mapping: undefined, mode: "upsert" as ImportMode };
  const body = await request.json().catch(() => null);
  if (!body || typeof body.csv !== "string" || (body.mapping != null && (typeof body.mapping !== "object" || Array.isArray(body.mapping))) || (body.mode != null && !importModes.includes(body.mode))) throw new Error("Provide a CSV string, optional column mapping, and a valid import mode.");
  return { csv: body.csv, mapping: body.mapping as Record<string, string> | undefined, mode: (body.mode ?? "upsert") as ImportMode };
}

export async function GET(request: Request) {
  const authorization = await authorizeAdminApi("catalog", "read");
  if (!authorization.authorized) return authorization.response;
  const params = new URL(request.url).searchParams;
  const requestedPage = Number(params.get("page") ?? 1);
  const requestedPageSize = Number(params.get("pageSize") ?? 25);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 10_000) : 1;
  const pageSize = Number.isSafeInteger(requestedPageSize) && requestedPageSize > 0 ? Math.min(requestedPageSize, 100) : 25;
  const [jobs, total] = await Promise.all([
    db.productImportJob.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, status: true, summary: true, errors: true, createdAt: true, startedAt: true, completedAt: true, actor: { select: { name: true, email: true } } } }),
    db.productImportJob.count(),
  ]);
  return NextResponse.json({ jobs, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

export async function POST(request: Request) {
  const authorization = await authorizeAdminApi("catalog");
  if (!authorization.authorized) return authorization.response;
  try {
    const { csv, mapping, mode } = await requestPayload(request);
    const [categories, branches, products, variants] = await Promise.all([
      db.category.findMany({ where: { archivedAt: null }, select: { id: true, slug: true } }),
      db.branch.findMany({ select: { id: true, name: true } }),
      db.product.findMany({ select: { id: true, slug: true, sku: true } }),
      db.productVariant.findMany({ select: { id: true, publicId: true, productId: true, sku: true } }),
    ]);
    const preview = previewImport({ csv, mapping, mode, categories, branches, products, variants });
    const job = await db.productImportJob.create({ data: { actorId: authorization.user.id, sourceCsv: csv, mapping: { columns: preview.mapping, mode }, summary: preview.summary, errors: preview.errors } });
    await db.auditLog.create({ data: { actorId: authorization.user.id, action: "catalog.import_previewed", entityType: "productImportJob", entityId: job.id, after: preview.summary } });
    return NextResponse.json({ job: { id: job.id, status: job.status, ...preview }, }, { status: 201 });
  } catch (error) {
    console.error("Unable to preview product import CSV.", error);
    const message = error instanceof Error && ["CSV must be 5 MB or smaller.", "Provide a CSV string and an optional column mapping."].includes(error.message) ? error.message : "Unable to preview CSV.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
