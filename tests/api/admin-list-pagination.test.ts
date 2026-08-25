import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeAdminApi: vi.fn(),
  customerFindMany: vi.fn(), customerCount: vi.fn(),
  promotionFindMany: vi.fn(), promotionCount: vi.fn(),
  importFindMany: vi.fn(), importCount: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ authorizeAdminApi: mocks.authorizeAdminApi }));
vi.mock("@/server/db", () => ({ db: {
  customer: { findMany: mocks.customerFindMany, count: mocks.customerCount },
  promotion: { findMany: mocks.promotionFindMany, count: mocks.promotionCount },
  productImportJob: { findMany: mocks.importFindMany, count: mocks.importCount },
} }));

describe("admin list pagination", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.authorizeAdminApi.mockResolvedValue({ authorized: true });
    mocks.customerFindMany.mockResolvedValue([]); mocks.customerCount.mockResolvedValue(51);
    mocks.promotionFindMany.mockResolvedValue([]); mocks.promotionCount.mockResolvedValue(26);
    mocks.importFindMany.mockResolvedValue([]); mocks.importCount.mockResolvedValue(26);
  });

  it("paginates customers with bounded values", async () => {
    const { GET } = await import("@/app/api/admin/customers/route");
    const response = await GET(new Request("https://store.example.test/api/admin/customers?page=2&pageSize=500"));

    await expect(response.json()).resolves.toMatchObject({ pagination: { page: 2, pageSize: 100, total: 51, totalPages: 1 } });
    expect(mocks.customerFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 100, take: 100 }));
  });

  it("paginates promotions and import history", async () => {
    const promotions = await import("@/app/api/admin/promotions/route");
    const imports = await import("@/app/api/admin/product-imports/route");

    await expect((await promotions.GET(new Request("https://store.example.test/api/admin/promotions?page=2"))).json()).resolves.toMatchObject({ pagination: { page: 2, pageSize: 25, totalPages: 2 } });
    await expect((await imports.GET(new Request("https://store.example.test/api/admin/product-imports?page=2"))).json()).resolves.toMatchObject({ pagination: { page: 2, pageSize: 25, totalPages: 2 } });
    expect(mocks.promotionFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 25, take: 25 }));
    expect(mocks.importFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 25, take: 25 }));
  });
});
