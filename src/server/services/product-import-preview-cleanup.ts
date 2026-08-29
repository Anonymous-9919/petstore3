import "server-only";

import { db } from "@/server/db";
import { isApprovedMediaPath } from "@/server/services/product-import";
import { removeImportedImages } from "@/server/services/product-import-media";

export const STALE_PRODUCT_IMPORT_PREVIEW_MS = 24 * 60 * 60 * 1000;

/** Returns only storage paths persisted with a ZIP-backed import preview. */
export function previewImagePaths(mapping: unknown) {
  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) return [];
  const imagePathsByRow = (mapping as { imagePathsByRow?: unknown }).imagePathsByRow;
  if (!imagePathsByRow || typeof imagePathsByRow !== "object" || Array.isArray(imagePathsByRow)) return [];
  return [...new Set(Object.values(imagePathsByRow).flatMap((paths) => Array.isArray(paths) ? paths : []).filter((path): path is string => typeof path === "string" && isApprovedMediaPath(path)))];
}

/** Expires abandoned previews and compensates for their unattached ZIP uploads. */
export async function cleanupStaleProductImportPreviews(now = new Date()) {
  const cutoff = new Date(now.getTime() - STALE_PRODUCT_IMPORT_PREVIEW_MS);
  const previews = await db.productImportJob.findMany({ where: { status: "PREVIEWED", createdAt: { lt: cutoff } }, select: { id: true, actorId: true, mapping: true } });
  const expired = [] as Array<{ id: string; actorId: string; paths: string[] }>;

  for (const preview of previews) {
    const claimed = await db.productImportJob.updateMany({ where: { id: preview.id, status: "PREVIEWED", createdAt: { lt: cutoff } }, data: { status: "FAILED", completedAt: now, errors: [{ row: 0, message: "Import preview expired before execution." }] } });
    if (claimed.count) expired.push({ id: preview.id, actorId: preview.actorId, paths: previewImagePaths(preview.mapping) });
  }

  const paths = [...new Set(expired.flatMap((preview) => preview.paths))];
  const attached = paths.length ? await db.productImage.findMany({ where: { path: { in: paths } }, select: { path: true } }) : [];
  const attachedPaths = new Set(attached.map((image) => image.path));
  const assets = paths.length ? await db.mediaAsset.findMany({ where: { path: { in: paths.filter((path) => !attachedPaths.has(path)) } }, select: { path: true } }) : [];
  const orphanedPaths = assets.map((asset) => asset.path);

  const storageRemoved = await removeImportedImages(orphanedPaths);
  if (storageRemoved && orphanedPaths.length) await db.mediaAsset.deleteMany({ where: { path: { in: orphanedPaths } } });
  if (expired.length) await db.auditLog.createMany({ data: expired.map((preview) => ({ actorId: preview.actorId, action: "catalog.import_preview_expired", entityType: "productImportJob", entityId: preview.id, after: { removedMedia: preview.paths.length } })) });

  return { expired: expired.length, removedMedia: storageRemoved ? orphanedPaths.length : 0 };
}
