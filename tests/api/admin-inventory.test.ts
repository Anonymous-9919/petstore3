import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeAdminApi: vi.fn(),
  inventoryFindMany: vi.fn(),
  inventoryCount: vi.fn(),
  inventoryFindUnique: vi.fn(),
  queryRawUnsafe: vi.fn(),
  movementFindMany: vi.fn(),
  auditFindMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ authorizeAdminApi: mocks.authorizeAdminApi }));
vi.mock("@/server/db", () => ({
  db: {
    inventoryLevel: { findMany: mocks.inventoryFindMany, count: mocks.inventoryCount, findUnique: mocks.inventoryFindUnique, fields: { reserved: "reserved" } },
    inventoryMovement: { findMany: mocks.movementFindMany },
    auditLog: { findMany: mocks.auditFindMany },
    $transaction: mocks.transaction,
    $queryRawUnsafe: mocks.queryRawUnsafe,
  },
}));

describe("admin inventory API", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.authorizeAdminApi.mockReset();
    mocks.authorizeAdminApi.mockResolvedValue({ authorized: true, user: { id: "e87b9df3-86b2-4b8c-a8ff-b4443e51e6bb" } });
    mocks.inventoryFindMany.mockReset(); mocks.inventoryFindMany.mockResolvedValue([]);
    mocks.inventoryCount.mockReset(); mocks.inventoryCount.mockResolvedValue(51);
    mocks.inventoryFindUnique.mockReset();
    mocks.queryRawUnsafe.mockReset(); mocks.queryRawUnsafe.mockResolvedValueOnce([{ id: "level-1" }]).mockResolvedValueOnce([{ total: 51 }]);
    mocks.movementFindMany.mockReset(); mocks.auditFindMany.mockReset();
    mocks.transaction.mockReset();
  });

  it("paginates low stock by available quantity and preserves database ordering", async () => {
    const { GET } = await import("@/app/api/admin/inventory/route");
    const response = await GET(new Request("https://store.example.test/api/admin/inventory?page=2&pageSize=25&branchId=de8ee636-f2e3-43db-a34a-7d6536bd50bb&categoryId=970ee4b1-41c9-4eb3-b6fb-cb5a16ce81d9&stock=low-stock"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ pagination: { page: 2, pageSize: 25, total: 51, totalPages: 3 } });
    expect(mocks.queryRawUnsafe).toHaveBeenCalledTimes(2);
    expect(mocks.queryRawUnsafe.mock.calls[0][0]).toContain('i."quantity" - i.reserved <= i."lowStockAt"');
    expect(mocks.inventoryFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["level-1"] } } }));
  });

  it("filters in- and out-of-stock levels by available quantity", async () => {
    const { GET } = await import("@/app/api/admin/inventory/route");

    await GET(new Request("https://store.example.test/api/admin/inventory?stock=in-stock"));
    expect(mocks.inventoryFindMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { quantity: { gt: "reserved" } } }));

    await GET(new Request("https://store.example.test/api/admin/inventory?stock=out-of-stock"));
    expect(mocks.inventoryFindMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { quantity: { lte: "reserved" } } }));
  });

  it("returns movements and audit snapshots for a specific inventory level", async () => {
    mocks.inventoryFindUnique.mockResolvedValue({ id: "4543449c-5211-476e-9463-cb597653657f", branchId: "de8ee636-f2e3-43db-a34a-7d6536bd50bb", productId: "970ee4b1-41c9-4eb3-b6fb-cb5a16ce81d9", variantId: "b5cf0a0c-fdb0-4271-bc65-72f8ab196b9f" });
    mocks.movementFindMany.mockResolvedValue([{ id: "movement" }]); mocks.auditFindMany.mockResolvedValue([{ id: "audit" }]);
    const { GET } = await import("@/app/api/admin/inventory/route");
    const response = await GET(new Request("https://store.example.test/api/admin/inventory?ledgerLevelId=4543449c-5211-476e-9463-cb597653657f"));

    await expect(response.json()).resolves.toEqual({ movements: [{ id: "movement" }], audits: [{ id: "audit" }] });
    expect(mocks.movementFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { branchId: "de8ee636-f2e3-43db-a34a-7d6536bd50bb", productId: "970ee4b1-41c9-4eb3-b6fb-cb5a16ce81d9", variantId: "b5cf0a0c-fdb0-4271-bc65-72f8ab196b9f" } }));
  });

  it("updates a threshold and writes its audit record in one transaction", async () => {
    const tx = { inventoryLevel: { findUnique: vi.fn().mockResolvedValue({ id: "4543449c-5211-476e-9463-cb597653657f", lowStockAt: 5 }), update: vi.fn().mockResolvedValue({ id: "4543449c-5211-476e-9463-cb597653657f", lowStockAt: 2 }) }, auditLog: { create: vi.fn().mockResolvedValue({}) } };
    mocks.transaction.mockImplementation((work) => work(tx));
    const { PATCH } = await import("@/app/api/admin/inventory/route");
    const response = await PATCH(new Request("https://store.example.test/api/admin/inventory", { method: "PATCH", body: JSON.stringify({ inventoryLevelId: "4543449c-5211-476e-9463-cb597653657f", lowStockAt: 2 }) }));

    expect(response.status).toBe(200);
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "inventory.low_stock_threshold_updated", before: { lowStockAt: 5 }, after: { lowStockAt: 2 } }) }));
  });

  it("creates a signed movement and before/change/after audit in the adjustment transaction", async () => {
    const tx = {
      inventoryLevel: { findUnique: vi.fn().mockResolvedValue({ id: "4543449c-5211-476e-9463-cb597653657f", branchId: "de8ee636-f2e3-43db-a34a-7d6536bd50bb", productId: "970ee4b1-41c9-4eb3-b6fb-cb5a16ce81d9", variantId: "b5cf0a0c-fdb0-4271-bc65-72f8ab196b9f" }) },
      $queryRaw: vi.fn().mockResolvedValue([{ quantity: 12, reserved: 3 }]),
      inventoryMovement: { create: vi.fn().mockResolvedValue({ id: "movement-id" }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    mocks.transaction.mockImplementation((work) => work(tx));
    const { POST } = await import("@/app/api/admin/inventory/route");
    const response = await POST(new Request("https://store.example.test/api/admin/inventory", { method: "POST", body: JSON.stringify({ inventoryLevelId: "4543449c-5211-476e-9463-cb597653657f", quantity: 2, reason: "Receiving", note: "Supplier delivery" }) }));

    expect(response.status).toBe(200);
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ variantId: "b5cf0a0c-fdb0-4271-bc65-72f8ab196b9f", type: "ADJUSTMENT", quantity: 2, beforeQuantity: 10, afterQuantity: 12, reason: "MANUAL_ADJUSTMENT", referenceType: "inventoryLevel", note: "Receiving: Supplier delivery" }) });
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ before: { quantity: 10, reserved: 3 }, after: { quantity: 12, reserved: 3, change: 2, movementId: "movement-id", reason: "Receiving", note: "Supplier delivery" } }) }));
  });

  it("paginates cross-catalog stock movements with filters and keeps variant identity", async () => {
    mocks.queryRawUnsafe.mockReset()
      .mockResolvedValueOnce([{ id: "movement-1", product: "Kibble", variant: "Large bag", quantity: -2, createdAt: new Date("2026-01-01T00:00:00.000Z") }])
      .mockResolvedValueOnce([{ total: 26 }]);
    const { GET } = await import("@/app/api/admin/inventory/movements/route");
    const response = await GET(new Request("https://store.example.test/api/admin/inventory/movements?page=2&pageSize=25&branchId=de8ee636-f2e3-43db-a34a-7d6536bd50bb&categoryId=970ee4b1-41c9-4eb3-b6fb-cb5a16ce81d9&type=SALE&query=kibble"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ movements: [{ variant: "Large bag", quantity: -2 }], pagination: { page: 2, pageSize: 25, total: 26, totalPages: 2 } });
    expect(mocks.queryRawUnsafe).toHaveBeenCalledTimes(2);
    expect(mocks.queryRawUnsafe.mock.calls[0][0]).toContain('m.type = $3::"InventoryMovementType"');
    expect(mocks.queryRawUnsafe.mock.calls[0][0]).toContain('v.name AS variant');
  });

  it("exports the filtered movement history as CSV", async () => {
    mocks.queryRawUnsafe.mockReset().mockResolvedValueOnce([{ id: "movement-1", createdAt: new Date("2026-01-01T00:00:00.000Z"), product: "Kibble", sku: "DOG-1", variant: "Large bag", variantSku: "DOG-1-L", branch: "Main", type: "SALE", reason: "ORDER_SALE", reasonValue: null, quantity: -2, beforeQuantity: 10, afterQuantity: 8, referenceType: "order", referenceId: "order-1", note: "Order sale" }]);
    const { GET } = await import("@/app/api/admin/inventory/movements/route");
    const response = await GET(new Request("https://store.example.test/api/admin/inventory/movements?format=csv&type=SALE"));

    expect(response.headers.get("content-type")).toContain("text/csv");
    await expect(response.text()).resolves.toContain('"Large bag"');
    expect(mocks.queryRawUnsafe.mock.calls[0][0]).toContain("LIMIT 10000");
  });
});
