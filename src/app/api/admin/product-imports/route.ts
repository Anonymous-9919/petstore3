import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { importModes, previewImport, MAX_IMPORT_BYTES, type ImportMode } from "@/server/services/product-import";
import { importZipImages, MAX_ZIP_BYTES, removeImportedImages } from "@/server/services/product-import-media";

async function requestPayload(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMPORT_BYTES + MAX_ZIP_BYTES + 100_000) throw new Error("CSV and image ZIP exceed the allowed size.");
  if (request.headers.get("content-type")?.includes("text/csv")) return { csv: await request.text(), mapping: undefined, mode: "upsert" as ImportMode };
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData(); const csvFile = form.get("csv"); const zipFile = form.get("images"); const mode = form.get("mode");
    if (!(csvFile instanceof File) || csvFile.size > MAX_IMPORT_BYTES || (zipFile != null && (!(zipFile instanceof File) || zipFile.size > MAX_ZIP_BYTES)) || (mode != null && (!importModes.includes(mode as ImportMode)))) throw new Error("Provide a CSV up to 5 MB, an optional image ZIP up to 30 MB, and a valid import mode.");
    return { csv: await csvFile.text(), mapping: undefined, mode: (mode ?? "upsert") as ImportMode, zip: zipFile instanceof File ? Buffer.from(await zipFile.arrayBuffer()) : undefined };
  }
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
    const { csv, mapping, mode, zip } = await requestPayload(request);
    const [categories, branches, products, variants] = await Promise.all([
      db.category.findMany({ where: { archivedAt: null }, select: { id: true, slug: true } }),
      db.branch.findMany({ select: { id: true, name: true } }),
      db.product.findMany({ select: { id: true, slug: true, sku: true } }),
      db.productVariant.findMany({ select: { id: true, publicId: true, productId: true, sku: true } }),
    ]);
    let preview = previewImport({ csv, mapping, mode, categories, branches, products, variants });
    let imagePathsByRow: Record<number, string[]> | undefined;
    let uploadedAssets: Array<{ path: string; name: string; contentType: string; size: number }> = [];
    let unmatchedImages: string[] = [];
    if (zip && !preview.errors.length) {
      const imported = await importZipImages(zip, preview.rows.map((row) => ({ row: row.row, handle: String(row.product.slug), productSku: typeof row.product.sku === "string" ? row.product.sku : null, variantSku: typeof row.variant.sku === "string" ? row.variant.sku : null })));
      imagePathsByRow = imported.pathsByRow;
      uploadedAssets = imported.assets;
      unmatchedImages = imported.unmatched;
      preview = previewImport({ csv, mapping, mode, categories, branches, products, variants, imagePathsByRow });
    }
    const imageSummary = zip ? { matchedImages: Object.values(imagePathsByRow ?? {}).reduce((total, paths) => total + paths.length, 0), unmatchedImages, missingImages: preview.rows.filter((row) => !row.imagePaths.length).length } : {};
    let job;
    try {
      job = await db.$transaction(async (tx) => {
        if (uploadedAssets.length) await tx.mediaAsset.createMany({ data: uploadedAssets.map((asset) => ({ ...asset, uploadedById: authorization.user.id })), skipDuplicates: true });
        const created = await tx.productImportJob.create({ data: { actorId: authorization.user.id, sourceCsv: csv, mapping: { columns: preview.mapping, mode, imagePathsByRow }, summary: { ...preview.summary, ...imageSummary }, errors: preview.errors } });
        await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "catalog.import_previewed", entityType: "productImportJob", entityId: created.id, after: preview.summary } });
        return created;
      });
    } catch (error) {
      await removeImportedImages(uploadedAssets.map((asset) => asset.path));
      throw error;
    }
    return NextResponse.json({ job: { id: job.id, status: job.status, ...preview }, }, { status: 201 });
  } catch (error) {
    console.error("Unable to preview product import CSV.", error);
    const message = error instanceof Error ? error.message : "Unable to preview CSV.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
