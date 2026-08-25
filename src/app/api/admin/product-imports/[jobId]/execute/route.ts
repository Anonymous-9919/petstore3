import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { authorizeAdminApi } from "@/server/auth";
import { revalidateStorefrontCatalog } from "@/server/catalog-cache";
import { db } from "@/server/db";
import { notifyStaff } from "@/server/notifications/staff";
import { IMPORT_BATCH_SIZE, previewImport, type ImportError, type ImportMode } from "@/server/services/product-import";
import { writeInventoryMovement } from "@/server/services/inventory-ledger";
import { importRemoteImage } from "@/server/services/remote-import-image";

type Params = { params: Promise<{ jobId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const authorization = await authorizeAdminApi("catalog");
  if (!authorization.authorized) return authorization.response;
  const { jobId } = await params;
  const job = await db.productImportJob.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Import job was not found." }, { status: 404 });
  if (job.status !== "PREVIEWED") return NextResponse.json({ error: "Only a previewed import can be executed once." }, { status: 409 });
  if (job.actorId !== authorization.user.id && authorization.user.role !== "OWNER" && authorization.user.role !== "MANAGER") return NextResponse.json({ error: "Only the importing administrator or a manager can execute this job." }, { status: 403 });

  const [categories, branches, products, variants] = await Promise.all([
    db.category.findMany({ where: { archivedAt: null }, select: { id: true, slug: true } }),
    db.branch.findMany({ select: { id: true, name: true } }),
    db.product.findMany({ select: { id: true, slug: true, sku: true } }),
    db.productVariant.findMany({ select: { id: true, publicId: true, productId: true, sku: true } }),
  ]);
  const savedConfiguration = job.mapping as { columns?: Record<string, string>; mode?: ImportMode } | null;
  const preview = previewImport({ csv: job.sourceCsv, mapping: savedConfiguration?.columns ?? (job.mapping as Record<string, string> | undefined), mode: savedConfiguration?.mode, categories, branches, products, variants });
  if (preview.errors.length) return NextResponse.json({ error: "The CSV no longer validates. Review the refreshed errors before execution.", errors: preview.errors }, { status: 409 });

  for (const row of preview.rows) {
    if (!row.imageUrl) continue;
    try {
      const image = await importRemoteImage(row.imageUrl);
      await db.mediaAsset.create({ data: { path: image.path, name: image.sourceUrl, contentType: image.contentType, size: image.size, uploadedById: authorization.user.id } });
      row.product.primaryImagePath = image.path;
      row.imagePaths = [image.path];
    } catch (error) {
      const message = error instanceof Error ? error.message : "Remote image could not be imported.";
      return NextResponse.json({ error: `Row ${row.row}: ${message}` }, { status: 400 });
    }
  }

  const claimed = await db.productImportJob.updateMany({ where: { id: job.id, status: "PREVIEWED" }, data: { status: "RUNNING", startedAt: new Date(), summary: { ...preview.summary, processed: 0, progress: 0 }, errors: [] } });
  if (!claimed.count) return NextResponse.json({ error: "This import is already running or has completed." }, { status: 409 });
  const errors: ImportError[] = []; let created = 0; let updated = 0;
  for (let offset = 0; offset < preview.rows.length; offset += IMPORT_BATCH_SIZE) {
    const batch = preview.rows.slice(offset, offset + IMPORT_BATCH_SIZE);
    try {
      const result = await db.$transaction(async (tx) => {
        let batchCreated = 0; let batchUpdated = 0;
        for (const row of batch) {
          const product = row.product as Prisma.ProductUncheckedCreateInput;
          const matches = await tx.product.findMany({ where: { OR: [{ slug: product.slug }, ...(product.sku ? [{ sku: product.sku }] : [])] }, select: { id: true, slug: true, sku: true } });
          if (matches.length > 1) throw new Error(`Row ${row.row}: slug and SKU identify different products.`);
          const existing = matches[0];
          const variant = row.variant as Prisma.ProductVariantUncheckedCreateInput;
          const { productId: _productId, ...variantData } = variant;
          const saved = existing ? await tx.product.update({ where: { id: existing.id }, data: product }) : await tx.product.create({ data: product });
          const variantMatches = await tx.productVariant.findMany({ where: { OR: [...(row.variantPublicId ? [{ publicId: row.variantPublicId }] : []), ...(variantData.sku ? [{ sku: variantData.sku }] : [])] }, select: { id: true, productId: true } });
          if (variantMatches.length > 1 || (variantMatches[0] && variantMatches[0].productId !== saved.id)) throw new Error(`Row ${row.row}: handle and variant identity identify different products.`);
          const savedVariant = variantMatches[0]
            ? await tx.productVariant.update({ where: { id: variantMatches[0].id }, data: variantData })
            : await tx.productVariant.create({ data: { productId: saved.id, ...variantData, isDefault: (await tx.productVariant.count({ where: { productId: saved.id } })) === 0 } });
          if (!existing) await tx.inventoryLevel.createMany({ data: branches.map((branch) => ({ branchId: branch.id, productId: saved.id, variantId: savedVariant.id })), skipDuplicates: true });
          if (existing) batchUpdated += 1;
          else batchCreated += 1;
          for (const inventory of row.inventory) {
            const level = await tx.inventoryLevel.findUnique({ where: { branchId_productId_variantId: { branchId: inventory.branchId, productId: saved.id, variantId: savedVariant.id } }, select: { id: true, quantity: true, reserved: true } });
            if (level && inventory.quantity < level.reserved) throw new Error(`Row ${row.row}: inventory cannot be lower than reserved stock.`);
            const before = level?.quantity ?? 0;
            if (level) await tx.inventoryLevel.update({ where: { id: level.id }, data: { quantity: inventory.quantity } });
            else await tx.inventoryLevel.create({ data: { branchId: inventory.branchId, productId: saved.id, variantId: savedVariant.id, quantity: inventory.quantity } });
            if (before !== inventory.quantity) await writeInventoryMovement(tx, { branchId: inventory.branchId, productId: saved.id, variantId: savedVariant.id, type: existing ? "ADJUSTMENT" : "OPENING_BALANCE", quantity: inventory.quantity - before, beforeQuantity: before, afterQuantity: inventory.quantity, reason: existing ? "CSV_IMPORT" : "OPENING_BALANCE", reasonValue: `CSV import ${job.id}`, referenceType: "productImportJob", referenceId: job.id, correlationId: job.id, note: `CSV import ${job.id}`, actorId: authorization.user.id });
          }
          await tx.auditLog.create({ data: { actorId: authorization.user.id, action: existing ? "catalog.import_updated" : "catalog.import_created", entityType: "product", entityId: saved.id, after: { importJobId: job.id, row: row.row, inventory: row.inventory } } });
        }
        return { created: batchCreated, updated: batchUpdated };
      }, { timeout: 15_000 });
       created += result.created; updated += result.updated;
    } catch (error) {
      // A failed batch is rolled back; later batches can still be processed safely.
      console.error(`Unable to execute product import batch for job ${job.id}.`, error);
      const message = error instanceof Error && /^(slug and SKU identify different products\.|inventory cannot be lower than reserved stock\.)$/.test(error.message.replace(/^Row \d+: /, "")) ? error.message.replace(/^Row \d+: /, "") : "Unable to import this row.";
       batch.forEach((row) => errors.push({ row: row.row, message }));
    }
    const processed = Math.min(offset + batch.length, preview.rows.length);
    await db.productImportJob.update({ where: { id: job.id }, data: { summary: { ...preview.summary, processed, progress: preview.rows.length ? Math.round((processed / preview.rows.length) * 100) : 100, created, updated, failed: errors.length }, errors } });
  }
  const status = errors.length ? "PARTIAL" : "COMPLETED";
  const summary = { ...preview.summary, created, updated, failed: errors.length };
  await db.$transaction(async (tx) => {
    await tx.productImportJob.update({ where: { id: job.id }, data: { status, completedAt: new Date(), summary, errors } });
    await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "catalog.import_executed", entityType: "productImportJob", entityId: job.id, after: summary } });
  });
  revalidateStorefrontCatalog();
  void notifyStaff({ title: `Product import ${status.toLowerCase()}`, body: `${created} created, ${updated} updated, ${errors.length} failed.`, href: "/admin/product-imports", roles: ["OWNER", "MANAGER", "INVENTORY_STAFF"] });
  return NextResponse.json({ id: job.id, status, summary, errors });
}
