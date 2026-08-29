import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authorizeAdminApi: vi.fn(), productUpdateMany: vi.fn(), productFindMany: vi.fn(), productUpdate: vi.fn(), variantUpdateMany: vi.fn(), auditCreateMany: vi.fn(), transaction: vi.fn() }));

vi.mock("@/server/auth", () => ({ authorizeAdminApi: mocks.authorizeAdminApi }));
vi.mock("@/server/catalog-cache", () => ({ revalidateStorefrontCatalog: vi.fn() }));
vi.mock("@/server/db", () => ({ db: { $transaction: mocks.transaction } }));

describe("admin product bulk actions", () => {
  beforeEach(() => {
    mocks.authorizeAdminApi.mockResolvedValue({ authorized: true, user: { id: "9d87b7f0-2bb4-4b63-8750-35e5d4221a80" } });
    mocks.productUpdateMany.mockResolvedValue({ count: 2 });
    mocks.productFindMany.mockResolvedValue([]);
    mocks.productUpdate.mockResolvedValue({});
    mocks.variantUpdateMany.mockResolvedValue({ count: 2 });
    mocks.auditCreateMany.mockResolvedValue({ count: 2 });
    mocks.transaction.mockImplementation((callback) => callback({ product: { updateMany: mocks.productUpdateMany, findMany: mocks.productFindMany, update: mocks.productUpdate }, productVariant: { updateMany: mocks.variantUpdateMany }, auditLog: { createMany: mocks.auditCreateMany } }));
  });

  it("archives selected products and writes an audit record for each", async () => {
    const { POST } = await import("@/app/api/admin/products/bulk/route");
    const ids = ["8d87b7f0-2bb4-4b63-8750-35e5d4221a80", "9d87b7f0-2bb4-4b63-8750-35e5d4221a80"];
    const response = await POST(new Request("https://store.example.test", { method: "POST", body: JSON.stringify({ action: "archive", productIds: ids }) }));

    expect(response.status).toBe(200);
    expect(mocks.productUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ids } }, data: expect.objectContaining({ isActive: false, archivedAt: expect.any(Date) }) }));
    expect(mocks.auditCreateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ action: "catalog.bulk_archive" })]) }));
  });

  it("rejects an incomplete category action before writing", async () => {
    const { POST } = await import("@/app/api/admin/products/bulk/route");
    const response = await POST(new Request("https://store.example.test", { method: "POST", body: JSON.stringify({ action: "category", productIds: ["8d87b7f0-2bb4-4b63-8750-35e5d4221a80"] }) }));

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("keeps checkout pricing aligned by updating only default variants", async () => {
    const { POST } = await import("@/app/api/admin/products/bulk/route");
    const ids = ["8d87b7f0-2bb4-4b63-8750-35e5d4221a80", "9d87b7f0-2bb4-4b63-8750-35e5d4221a80"];
    const response = await POST(new Request("https://store.example.test", { method: "POST", body: JSON.stringify({ action: "price", productIds: ids, basePrice: 4.5, compareAtPrice: 6 }) }));

    expect(response.status).toBe(200);
    expect(mocks.productUpdateMany).toHaveBeenCalledWith({ where: { id: { in: ids } }, data: { basePrice: 4.5, compareAtPrice: 6 } });
    expect(mocks.variantUpdateMany).toHaveBeenCalledWith({ where: { productId: { in: ids }, isDefault: true }, data: { price: 4.5, compareAtPrice: 6 } });
  });

  it("merges normalized tags without replacing existing product tags", async () => {
    mocks.productFindMany.mockResolvedValue([{ id: "8d87b7f0-2bb4-4b63-8750-35e5d4221a80", tags: ["dogs", "food"] }]);
    const { POST } = await import("@/app/api/admin/products/bulk/route");
    const response = await POST(new Request("https://store.example.test", { method: "POST", body: JSON.stringify({ action: "tags", productIds: ["8d87b7f0-2bb4-4b63-8750-35e5d4221a80"], tags: ["Food", "New"] }) }));

    expect(response.status).toBe(200);
    expect(mocks.productUpdate).toHaveBeenCalledWith({ where: { id: "8d87b7f0-2bb4-4b63-8750-35e5d4221a80" }, data: { tags: ["dogs", "food", "new"] } });
    expect(mocks.auditCreateMany).toHaveBeenCalledWith(expect.objectContaining({ data: [expect.objectContaining({ action: "catalog.bulk_tags" })] }));
  });
});
