import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeAdminApi: vi.fn(),
  canAccess: vi.fn(),
  productFindMany: vi.fn(),
  categoryFindMany: vi.fn(),
  orderFindMany: vi.fn(),
  customerFindMany: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ authorizeAdminApi: mocks.authorizeAdminApi, canAccess: mocks.canAccess }));
vi.mock("@/server/db", () => ({ db: { product: { findMany: mocks.productFindMany }, category: { findMany: mocks.categoryFindMany }, order: { findMany: mocks.orderFindMany }, customer: { findMany: mocks.customerFindMany } } }));

describe("admin search", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.authorizeAdminApi.mockResolvedValue({ authorized: true, user: { role: "ORDER_STAFF" } });
    mocks.canAccess.mockImplementation((_role, resource) => resource === "orders");
    mocks.productFindMany.mockResolvedValue([]);
    mocks.categoryFindMany.mockResolvedValue([]);
    mocks.orderFindMany.mockResolvedValue([]);
    mocks.customerFindMany.mockResolvedValue([]);
  });

  it("rejects short queries before querying data", async () => {
    const { GET } = await import("@/app/api/admin/search/route");
    const response = await GET(new Request("https://store.example.test/api/admin/search?q=x"));

    expect(response.status).toBe(400);
    expect(mocks.orderFindMany).not.toHaveBeenCalled();
  });

  it("only searches resources available to the staff role", async () => {
    mocks.orderFindMany.mockResolvedValue([{ orderNumber: "ORD-100", contactName: "Ada", contactPhone: "55512345" }]);
    const { GET } = await import("@/app/api/admin/search/route");
    const response = await GET(new Request("https://store.example.test/api/admin/search?q=Ada"));

    expect(mocks.productFindMany).not.toHaveBeenCalled();
    expect(mocks.categoryFindMany).not.toHaveBeenCalled();
    expect(mocks.customerFindMany).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ results: [{ type: "order", label: "ORD-100", detail: "Ada | 55512345", href: "/admin/orders" }] });
  });

  it("rejects unauthenticated requests before parsing or querying", async () => {
    mocks.authorizeAdminApi.mockResolvedValue({ authorized: false, response: Response.json({ error: "Unauthorized." }, { status: 401 }) });
    const { GET } = await import("@/app/api/admin/search/route");
    const response = await GET(new Request("https://store.example.test/api/admin/search?q=Ada"));

    expect(response.status).toBe(401);
    expect(mocks.orderFindMany).not.toHaveBeenCalled();
  });
});
