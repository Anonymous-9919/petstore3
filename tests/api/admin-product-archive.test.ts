import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authorizeAdminApi: vi.fn(), productFindUnique: vi.fn(), productUpdate: vi.fn(), auditCreate: vi.fn() }));

vi.mock("@/server/auth", () => ({ authorizeAdminApi: mocks.authorizeAdminApi }));
vi.mock("@/server/db", () => ({ db: {
  $transaction: async (callback: (tx: unknown) => unknown) => callback({
    product: { findUnique: mocks.productFindUnique, update: mocks.productUpdate },
    auditLog: { create: mocks.auditCreate },
  }),
} }));

describe("admin product archive lifecycle", () => {
  beforeEach(() => {
    mocks.authorizeAdminApi.mockResolvedValue({ authorized: true, user: { id: "staff-id" } });
    mocks.productFindUnique.mockResolvedValue({ isActive: true, archivedAt: null });
    mocks.productUpdate.mockResolvedValue({ id: "product-id" });
    mocks.auditCreate.mockResolvedValue({});
  });

  it("archives by disabling the product and records an archive timestamp", async () => {
    const { DELETE } = await import("@/app/api/admin/products/[productId]/route");
    const response = await DELETE(new Request("https://store.example.test"), { params: Promise.resolve({ productId: "product-id" }) });

    expect(response.status).toBe(200);
    expect(mocks.productUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ isActive: false, archivedAt: expect.any(Date) }) }));
  });

  it("restores by clearing the archive timestamp and reactivating the product", async () => {
    const { POST } = await import("@/app/api/admin/products/[productId]/restore/route");
    const response = await POST(new Request("https://store.example.test"), { params: Promise.resolve({ productId: "product-id" }) });

    expect(response.status).toBe(200);
    expect(mocks.productUpdate).toHaveBeenCalledWith({ where: { id: "product-id" }, data: { archivedAt: null, isActive: true } });
  });
});
