import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authorizeAdminApi: vi.fn(), productFindMany: vi.fn(), productCount: vi.fn() }));

vi.mock("@/server/auth", () => ({ authorizeAdminApi: mocks.authorizeAdminApi }));
vi.mock("@/server/db", () => ({ db: { product: { findMany: mocks.productFindMany, count: mocks.productCount }, inventoryLevel: { fields: { reserved: "reserved" } } } }));

describe("admin product pagination", () => {
  beforeEach(() => {
    mocks.authorizeAdminApi.mockResolvedValue({ authorized: true });
    mocks.productFindMany.mockResolvedValue([]);
    mocks.productCount.mockResolvedValue(52);
  });

  it("uses bounded validated query values for the database request", async () => {
    const { GET } = await import("@/app/api/admin/products/route");
    const response = await GET(new Request("https://store.example.test/api/admin/products?page=2&pageSize=25&query=food&status=active&archived=active&stock=in-stock&sort=basePrice&direction=desc"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ pagination: { page: 2, pageSize: 25, total: 52, totalPages: 3 } });
    expect(mocks.productFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 25, take: 25, orderBy: [{ basePrice: "desc" }, { id: "asc" }] }));
  });

  it("rejects invalid sort input before querying products", async () => {
    const { GET } = await import("@/app/api/admin/products/route");
    const response = await GET(new Request("https://store.example.test/api/admin/products?sort=unsafe"));

    expect(response.status).toBe(400);
    expect(mocks.productFindMany).not.toHaveBeenCalled();
  });

  it("uses unreserved availability across all branch and variant levels for stock status", async () => {
    const { GET } = await import("@/app/api/admin/products/route");

    await GET(new Request("https://store.example.test/api/admin/products?stock=in-stock"));
    expect(mocks.productFindMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ inventoryLevels: { some: { quantity: { gt: "reserved" } } } }) }));

    await GET(new Request("https://store.example.test/api/admin/products?stock=out-of-stock"));
    expect(mocks.productFindMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ inventoryLevels: { none: { quantity: { gt: "reserved" } } } }) }));
  });
});
