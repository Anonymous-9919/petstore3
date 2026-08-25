import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeAdminApi: vi.fn(),
  orderAggregate: vi.fn(),
  orderGroupBy: vi.fn(),
  inventoryFindMany: vi.fn(),
  productCreate: vi.fn(),
  promotionFindMany: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ authorizeAdminApi: mocks.authorizeAdminApi }));
vi.mock("@/server/db", () => ({
  db: {
    order: { aggregate: mocks.orderAggregate, groupBy: mocks.orderGroupBy },
    inventoryLevel: { findMany: mocks.inventoryFindMany },
    product: { create: mocks.productCreate },
    promotion: { findMany: mocks.promotionFindMany },
  },
}));

describe("direct admin endpoint authorization", () => {
  beforeEach(() => {
    mocks.authorizeAdminApi.mockReset();
    mocks.authorizeAdminApi.mockResolvedValue({
      authorized: false,
      response: Response.json({ error: "Forbidden." }, { status: 403 }),
    });
  });

  it("guards report reads before querying protected data", async () => {
    const { GET } = await import("@/app/api/admin/reports/route");
    const response = await GET(new Request("https://store.example.test/api/admin/promotions"));

    expect(response.status).toBe(403);
    expect(mocks.authorizeAdminApi).toHaveBeenCalledWith("reports", "read");
    expect(mocks.orderAggregate).not.toHaveBeenCalled();
    expect(mocks.inventoryFindMany).not.toHaveBeenCalled();
  });

  it("guards catalog mutations before parsing or writing", async () => {
    const { POST } = await import("@/app/api/admin/products/route");
    const response = await POST(new Request("https://store.example.test/api/admin/products", {
      method: "POST",
      body: "not-json",
    }));

    expect(response.status).toBe(403);
    expect(mocks.authorizeAdminApi).toHaveBeenCalledWith("catalog");
    expect(mocks.productCreate).not.toHaveBeenCalled();
  });

  it("guards promotion reads before querying marketing data", async () => {
    const { GET } = await import("@/app/api/admin/promotions/route");
    const response = await GET(new Request("https://store.example.test/api/admin/promotions"));

    expect(response.status).toBe(403);
    expect(mocks.authorizeAdminApi).toHaveBeenCalledWith("marketing", "read");
    expect(mocks.promotionFindMany).not.toHaveBeenCalled();
  });
});
