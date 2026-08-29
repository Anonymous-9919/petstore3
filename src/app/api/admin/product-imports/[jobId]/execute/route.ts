import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { authorizeAdminApi } from "@/server/auth";
import { revalidateStorefrontCatalog } from "@/server/catalog-cache";
import { db } from "@/server/db";
import { notifyStaff } from "@/server/notifications/staff";
import { IMPORT_BATCH_SIZE, previewImport, type ImportError, type ImportMode } from "@/server/services/product-import";
import { writeInventoryMovement } from "@/server/services/inventory-ledger";
import { importRemoteImage, removeImportedImages } from "@/server/services/product-import-media";

type Params = { params: Promise<{ jobId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const authorization = await authorizeAdminApi("catalog");
  if (!authorization.authorized) return authorization.response;
  const { jobId } = await params;
  const job = await db.productImportJob.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Import job was not found." }, { status: 404 });
  if (job.status !== "PREVIEWED") return NextResponse.json({ error: "Only a previewed import can be executed once." }, { status: 409 });
  if (job.actorId !== authorization.user.id && authorization.user.role !== "OWNER" && authorization.user.role !== "MANAGER") return NextResponse.json({ error: "Only the importing administrator or a manager can execute this job." }, { status: 403 });
  // Claim before any revalidation or storage side effect so only one request can execute.
  const claimed = await db.productImportJob.updateMany({ where: { id: job.id, status: "PREVIEWED" }, data: { status: "RUNNING", startedAt: new Date(), summary: { ...(job.summary as Record<string, unknown>), processed: 0, progress: 0 }, errors: [] } });
  if (!claimed.count) return NextResponse.json({ error: "This import is already running or has completed." }, { status: 409 });

  const fail = async (message: string, errors: ImportError[] = []) => {
    await db.productImportJob.update({ where: { id: job.id }, data: { status: "FAILED", completedAt: new Date(), errors } });
    return NextResponse.json({ error: message, ...(errors.length ? { errors } : {}) }, { status: 409 });
  };

  const [categories, branches, products, variants] = await Promise.all([
    db.category.findMany({ where: { archivedAt: null }, select: { id: true, slug: true } }),
    db.branch.findMany({ select: { id: true, name: true } }),
    db.product.findMany({ select: { id: true, slug: true, sku: true } }),
    db.productVariant.findMany({ select: { id: true, publicId: true, productId: true, sku: true } }),
  ]);
  const savedConfiguration = job.mapping as { columns?: Record<string, string>; mode?: ImportMode; imagePathsByRow?: Record<number, string[]> } | null;
  const preview = previewImport({ csv: job.sourceCsv, mapping: savedConfiguration?.columns ?? (job.mapping as Record<string, string> | undefined), mode: savedConfiguration?.mode, imagePathsByRow: savedConfiguration?.imagePathsByRow, categories, branches, products, variants });
  if (preview.errors.length) return fail("The CSV no longer validates. Review the refreshed errors before execution.", preview.errors);

  const pendingRemotePaths = new Set<string>();
  const cleanupRemotePaths = async (paths: Iterable<string>) => {
    const values = [...new Set([...paths].filter((path) => pendingRemotePaths.has(path)))];
    if (!values.length) return;
    await removeImportedImages(values);
    await db.mediaAsset.deleteMany({ where: { path: { in: values }, uploadedById: authorization.user.id } });
    values.forEach((path) => pendingRemotePaths.delete(path));
  };
  for (const row of preview.rows) {
    if (!row.imageUrls.length) continue;
    try {
      for (const imageUrl of row.imageUrls) {
        const image = await importRemoteImage(imageUrl);
        pendingRemotePaths.add(image.path);
        await db.mediaAsset.create({ data: { path: image.path, name: imageUrl, contentType: image.contentType, size: image.size, uploadedById: authorization.user.id } });
        row.imagePaths.push(image.path);
        if (!row.product.primaryImagePath) row.product.primaryImagePath = image.path;
      }
    } catch (error) {
      await cleanupRemotePaths(pendingRemotePaths);
      const message = error instanceof Error ? error.message : "Remote image could not be imported.";
      return fail(`Row ${row.row}: ${message}`, [{ row: row.row, field: "image_urls", message }]);
    }
  }
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
           const variantMatches = await tx.productVariant.findMany({ where: { OR: [...(row.variantPublicId ? [{ publicId: row.variantPublicId }] : []), ...(variantData.sku ? [{ sku: variantData.sku }] : [])] }, select: { id: true, productId: true } });
           const existingVariant = variantMatches[0];
           if (variantMatches.length > 1 || (existingVariant && (!existing || existingVariant.productId !== existing.id))) throw new Error(`Row ${row.row}: handle and variant identity identify different products.`);
           if (preview.mode === "create" && (existing || existingVariant)) throw new Error(`Row ${row.row}: create mode cannot overwrite an existing product or variant.`);
           if (preview.mode === "update" && (!existing || !existingVariant)) throw new Error(`Row ${row.row}: update mode requires an existing product and variant.`);
           const saved = existing ? await tx.product.update({ where: { id: existing.id }, data: product }) : await tx.product.create({ data: product });
            const savedVariant = existingVariant
             ? await tx.productVariant.update({ where: { id: existingVariant.id }, data: variantData })
            : await tx.productVariant.create({ data: { productId: saved.id, ...variantData, isDefault: (await tx.productVariant.count({ where: { productId: saved.id } })) === 0 } });
           if (!existing) await tx.inventoryLevel.createMany({ data: branches.map((branch) => ({ branchId: branch.id, productId: saved.id, variantId: savedVariant.id })), skipDuplicates: true });
           const imagePaths = [...new Set(row.imagePaths)];
           if (imagePaths.length) {
             const existingImages = await tx.productImage.findMany({ where: { productId: saved.id, path: { in: imagePaths } }, select: { path: true } });
             const attached = new Set(existingImages.map((image) => image.path));
             const newPaths = imagePaths.filter((path) => !attached.has(path));
             if (newPaths.length) {
               const current = await tx.productImage.aggregate({ where: { productId: saved.id }, _max: { sortOrder: true } });
                await tx.productImage.createMany({ data: newPaths.map((path, index) => ({ productId: saved.id, path, sortOrder: (current._max.sortOrder ?? -1) + index + 1 })), skipDuplicates: true });
             }
           }
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
       for (const row of batch) row.imagePaths.forEach((path) => pendingRemotePaths.delete(path));
    } catch (error) {
      // A failed batch is rolled back; later batches can still be processed safely.
      console.error(`Unable to execute product import batch for job ${job.id}.`, error);
      const message = error instanceof Error && /^(slug and SKU identify different products\.|inventory cannot be lower than reserved stock\.)$/.test(error.message.replace(/^Row \d+: /, "")) ? error.message.replace(/^Row \d+: /, "") : "Unable to import this row.";
        batch.forEach((row) => errors.push({ row: row.row, message }));
        await cleanupRemotePaths(batch.flatMap((row) => row.imagePaths));
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
