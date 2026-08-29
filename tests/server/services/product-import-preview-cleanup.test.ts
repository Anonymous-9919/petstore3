import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findPreviews: vi.fn(), claimPreview: vi.fn(), findImages: vi.fn(), findAssets: vi.fn(), deleteAssets: vi.fn(), createAuditLogs: vi.fn(), removeImages: vi.fn(),
}));

vi.mock("@/server/db", () => ({ db: {
  productImportJob: { findMany: mocks.findPreviews, updateMany: mocks.claimPreview },
  productImage: { findMany: mocks.findImages },
  mediaAsset: { findMany: mocks.findAssets, deleteMany: mocks.deleteAssets },
  auditLog: { createMany: mocks.createAuditLogs },
} }));
vi.mock("@/server/services/product-import-media", () => ({ removeImportedImages: mocks.removeImages }));

describe("product import preview cleanup", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.claimPreview.mockResolvedValue({ count: 1 });
    mocks.findImages.mockResolvedValue([]);
    mocks.findAssets.mockResolvedValue([]);
    mocks.removeImages.mockResolvedValue(true);
    mocks.createAuditLogs.mockResolvedValue({ count: 1 });
  });

  it("extracts only approved ZIP preview paths", async () => {
    const { previewImagePaths } = await import("@/server/services/product-import-preview-cleanup");
    expect(previewImagePaths({ imagePathsByRow: { 2: ["uploads/2026-08-29/123e4567-e89b-42d3-a456-426614174000.webp", "https://example.test/image.webp"], 3: ["uploads/2026-08-29/123e4567-e89b-42d3-a456-426614174000.webp"] } })).toEqual(["uploads/2026-08-29/123e4567-e89b-42d3-a456-426614174000.webp"]);
  });

  it("expires claimed previews and removes only unattached registered assets", async () => {
    const path = "uploads/2026-08-29/123e4567-e89b-42d3-a456-426614174000.webp";
    mocks.findPreviews.mockResolvedValue([{ id: "job-1", actorId: "user-1", mapping: { imagePathsByRow: { 2: [path] } } }]);
    mocks.findAssets.mockResolvedValue([{ path }]);
    const { cleanupStaleProductImportPreviews, STALE_PRODUCT_IMPORT_PREVIEW_MS } = await import("@/server/services/product-import-preview-cleanup");
    const now = new Date("2026-08-29T12:00:00.000Z");

    await expect(cleanupStaleProductImportPreviews(now)).resolves.toEqual({ expired: 1, removedMedia: 1 });
    expect(mocks.claimPreview).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ createdAt: { lt: new Date(now.getTime() - STALE_PRODUCT_IMPORT_PREVIEW_MS) } }) }));
    expect(mocks.removeImages).toHaveBeenCalledWith([path]);
    expect(mocks.deleteAssets).toHaveBeenCalledWith({ where: { path: { in: [path] } } });
  });

  it("retains media that is already associated with a product", async () => {
    const path = "uploads/2026-08-29/123e4567-e89b-42d3-a456-426614174000.webp";
    mocks.findPreviews.mockResolvedValue([{ id: "job-1", actorId: "user-1", mapping: { imagePathsByRow: { 2: [path] } } }]);
    mocks.findImages.mockResolvedValue([{ path }]);
    const { cleanupStaleProductImportPreviews } = await import("@/server/services/product-import-preview-cleanup");

    await expect(cleanupStaleProductImportPreviews()).resolves.toEqual({ expired: 1, removedMedia: 0 });
    expect(mocks.removeImages).toHaveBeenCalledWith([]);
    expect(mocks.deleteAssets).not.toHaveBeenCalled();
  });
});
