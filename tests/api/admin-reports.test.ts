import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeAdminApi: vi.fn(), orderAggregate: vi.fn(), orderItemAggregate: vi.fn(), orderGroupBy: vi.fn(), orderStatusHistoryFindMany: vi.fn(),
  branchFindMany: vi.fn(), categoryFindMany: vi.fn(), productFindMany: vi.fn(), queryRawUnsafe: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ authorizeAdminApi: mocks.authorizeAdminApi }));
vi.mock("@/server/db", () => ({ db: {
  order: { aggregate: mocks.orderAggregate, groupBy: mocks.orderGroupBy }, orderItem: { aggregate: mocks.orderItemAggregate }, orderStatusHistory: { findMany: mocks.orderStatusHistoryFindMany },
  branch: { findMany: mocks.branchFindMany }, category: { findMany: mocks.categoryFindMany }, product: { findMany: mocks.productFindMany }, $queryRawUnsafe: mocks.queryRawUnsafe,
} }));

describe("admin reports", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.authorizeAdminApi.mockResolvedValue({ authorized: true, user: { role: "MANAGER" } });
    mocks.orderAggregate.mockResolvedValue({ _count: 2, _sum: { total: { toString: () => "12.500" }, subtotal: { toString: () => "10.000" }, discountTotal: { toString: () => "0" }, deliveryFee: { toString: () => "2.500" } } });
    mocks.orderItemAggregate.mockResolvedValue({ _sum: { quantity: 4, lineTotal: { toString: () => "12.500" } } });
    mocks.orderGroupBy.mockResolvedValue([{ status: "NEW", _count: 2 }]);
    mocks.orderStatusHistoryFindMany.mockResolvedValue([]);
    mocks.queryRawUnsafe.mockImplementation((query: string) => query.includes('AS known_units')
      ? Promise.resolve([{ known_units: 5, unavailable_units: 0, cost: "6.250" }])
      : Promise.resolve([{ id: "level-1", product: "Kibble", branch: "Salmiya", quantity: 5, reserved: 2, low_stock_at: 3, available: 3 }]));
    mocks.branchFindMany.mockResolvedValue([]); mocks.categoryFindMany.mockResolvedValue([]); mocks.productFindMany.mockResolvedValue([]);
  });

  it("scopes units and gross totals to matching item lines while counts remain matching orders", async () => {
    const { GET } = await import("@/app/api/admin/reports/route");
    const response = await GET(new Request("https://store.example.test/api/admin/reports?start=2026-01-02&end=2026-01-05&branchId=branch-1&categoryId=category-1&productId=product-1"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ metrics: { orders: 2, grossOrderTotal: "12.500", units: 4, averageOrderValue: "6.250" }, fulfillment: { delivered: 0, refunded: 0, cancelled: 0, inProgress: 2, duration: { recordedDeliveries: 0, averageHours: null } }, inventoryValuation: { status: "available", cost: "6.250", knownUnits: 5, unavailableUnits: 0 }, inventory: [{ available: 3 }] });
    const expectedOrderWhere = { createdAt: { gte: new Date("2026-01-02T00:00:00.000Z"), lt: new Date("2026-01-06T00:00:00.000Z") }, branchId: "branch-1", items: { some: { productId: "product-1", categoryIdSnapshot: "category-1" } } };
    expect(mocks.orderAggregate).toHaveBeenCalledWith(expect.objectContaining({ where: expectedOrderWhere }));
    expect(mocks.orderItemAggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: { productId: "product-1", categoryIdSnapshot: "category-1", order: { createdAt: expectedOrderWhere.createdAt, branchId: "branch-1" } },
      _sum: { quantity: true, lineTotal: true },
    }));
    expect(mocks.orderGroupBy).toHaveBeenCalledWith(expect.objectContaining({ where: expectedOrderWhere }));
    expect(mocks.queryRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('SUM(CASE WHEN v.cost IS NOT NULL'), "branch-1", "product-1", "category-1");
    expect(mocks.orderStatusHistoryFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { toStatus: "DELIVERED", order: expectedOrderWhere }, take: 1001 }));
  });

  it("rejects invalid dates before issuing report queries", async () => {
    const { GET } = await import("@/app/api/admin/reports/route");
    const response = await GET(new Request("https://store.example.test/api/admin/reports?start=not-a-date"));

    expect(response.status).toBe(400);
    expect(mocks.orderAggregate).not.toHaveBeenCalled();
  });

  it("exports the scoped report as CSV", async () => {
    const { GET } = await import("@/app/api/admin/reports/route");
    const response = await GET(new Request("https://store.example.test/api/admin/reports?start=2026-01-02&end=2026-01-05&format=csv"));

    expect(response.headers.get("content-type")).toContain("text/csv");
    await expect(response.text()).resolves.toContain('"metric","gross_order_total_kwd","12.500"');
  });

  it("reports current terminal statuses, recorded delivery duration, and partial variant-cost coverage", async () => {
    mocks.orderGroupBy.mockResolvedValue([{ status: "DELIVERED", _count: 1 }, { status: "REFUNDED", _count: 1 }, { status: "CANCELLED", _count: 1 }, { status: "OUT_FOR_DELIVERY", _count: 1 }]);
    mocks.orderStatusHistoryFindMany.mockResolvedValue([{ createdAt: new Date("2026-01-03T06:00:00.000Z"), order: { createdAt: new Date("2026-01-03T00:00:00.000Z") } }]);
    mocks.queryRawUnsafe.mockImplementation((query: string) => query.includes('AS known_units')
      ? Promise.resolve([{ known_units: 5, unavailable_units: 3, cost: "6.250" }])
      : Promise.resolve([]));
    const { GET } = await import("@/app/api/admin/reports/route");
    const response = await GET(new Request("https://store.example.test/api/admin/reports?start=2026-01-02&end=2026-01-05"));

    await expect(response.json()).resolves.toMatchObject({
      fulfillment: { delivered: 1, refunded: 1, cancelled: 1, inProgress: 1, duration: { recordedDeliveries: 1, averageHours: "6.0" } },
      inventoryValuation: { status: "partial", cost: "6.250", knownUnits: 5, unavailableUnits: 3 },
    });
  });

  it("returns a bounded, server-aggregated table CSV", async () => {
    mocks.queryRawUnsafe.mockImplementation((query: string) => query.includes('FROM "OrderItem"')
      ? Promise.resolve([{ name: "Kibble", units: 4, gross_line_total: "12.500", orders: 2 }])
      : query.includes('AS known_units')
        ? Promise.resolve([{ known_units: 5, unavailable_units: 0, cost: "6.250" }])
        : Promise.resolve([]));
    const { GET } = await import("@/app/api/admin/reports/route");
    const response = await GET(new Request("https://store.example.test/api/admin/reports?table=products&page=2&pageSize=10&format=csv"));

    expect(mocks.queryRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('FROM "OrderItem"'), expect.any(Date), expect.any(Date), 10, 10);
    await expect(response.text()).resolves.toContain('"name","units","gross_line_total","orders"');
  });

  it("bounds supporting lists while keeping inventory valuation as an exact aggregate", async () => {
    mocks.branchFindMany.mockResolvedValue(Array.from({ length: 251 }, (_, index) => ({ id: `branch-${index}`, name: `Branch ${index}` })));
    mocks.categoryFindMany.mockResolvedValue(Array.from({ length: 251 }, (_, index) => ({ id: `category-${index}`, name: `Category ${index}` })));
    mocks.productFindMany.mockResolvedValue(Array.from({ length: 251 }, (_, index) => ({ id: `product-${index}`, name: `Product ${index}`, sku: null, categoryId: "category-1" })));
    mocks.queryRawUnsafe.mockImplementation((query: string) => query.includes('AS known_units')
      ? Promise.resolve([{ known_units: 5000, unavailable_units: 20, cost: "1250.000" }])
      : Promise.resolve(Array.from({ length: 101 }, (_, index) => ({ id: `level-${index}`, product: "Kibble", branch: "Salmiya", available: index }))));
    const { GET } = await import("@/app/api/admin/reports/route");
    const response = await GET(new Request("https://store.example.test/api/admin/reports"));

    await expect(response.json()).resolves.toMatchObject({
      inventoryValuation: { status: "partial", cost: "1250.000", knownUnits: 5000, unavailableUnits: 20 },
      inventoryCoverage: { limit: 100, hasMore: true },
      filterOptions: { limit: 250, truncated: { branches: true, categories: true, products: true } },
    });
    expect(mocks.branchFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 251 }));
    expect(mocks.categoryFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 251 }));
    expect(mocks.productFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 251 }));
    expect(mocks.queryRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('LIMIT 101'));
  });

  it("labels delivery duration as sampled when its bounded query reaches the limit", async () => {
    mocks.orderStatusHistoryFindMany.mockResolvedValue(Array.from({ length: 1001 }, () => ({ createdAt: new Date("2026-01-03T06:00:00.000Z"), order: { createdAt: new Date("2026-01-03T00:00:00.000Z") } })));
    const { GET } = await import("@/app/api/admin/reports/route");
    const response = await GET(new Request("https://store.example.test/api/admin/reports"));

    await expect(response.json()).resolves.toMatchObject({ fulfillment: { duration: { recordedDeliveries: 1000, averageHours: "6.0", coverage: "sampled", limit: 1000 } } });
  });

  it("filters table line totals by product instead of including unrelated items from matching orders", async () => {
    const { GET } = await import("@/app/api/admin/reports/route");
    await GET(new Request("https://store.example.test/api/admin/reports?table=branches&productId=product-1"));

    const [query, ...values] = mocks.queryRawUnsafe.mock.calls[0];
    expect(query).toContain('SUM(i."lineTotal")');
    expect(query).toContain('i."productId" = $3');
    expect(query).not.toContain('SUM(o.total)');
    expect(values).toContain("product-1");
  });

  it("filters category table line totals to the requested category", async () => {
    const { GET } = await import("@/app/api/admin/reports/route");
    await GET(new Request("https://store.example.test/api/admin/reports?table=sales&categoryId=category-1"));

    const [query, ...values] = mocks.queryRawUnsafe.mock.calls[0];
    expect(query).toContain('SUM(i."lineTotal")');
    expect(query).toContain('i."categoryIdSnapshot" = $3');
    expect(query).not.toContain('SUM(o.total)');
    expect(values).toContain("category-1");
  });
});
