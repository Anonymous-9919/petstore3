import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeAdminApi: vi.fn(),
  promotionFindMany: vi.fn(),
  promotionUpdateMany: vi.fn(),
  notifyStaff: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ authorizeAdminApi: mocks.authorizeAdminApi }));
vi.mock("@/server/db", () => ({ db: { promotion: { findMany: mocks.promotionFindMany, updateMany: mocks.promotionUpdateMany } } }));
vi.mock("@/server/notifications/staff", () => ({ notifyStaff: mocks.notifyStaff }));

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("promotion template API", () => {
  it("requires marketing read access", async () => {
    mocks.authorizeAdminApi.mockResolvedValue({ authorized: false, response: Response.json({ error: "Forbidden." }, { status: 403 }) });
    const { GET } = await import("@/app/api/admin/promotions/templates/route");

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mocks.authorizeAdminApi).toHaveBeenCalledWith("marketing", "read");
  });

  it("returns server-owned promotion templates", async () => {
    mocks.authorizeAdminApi.mockResolvedValue({ authorized: true });
    const { GET } = await import("@/app/api/admin/promotions/templates/route");

    await expect((await GET()).json()).resolves.toMatchObject({ templates: expect.arrayContaining([expect.objectContaining({ id: "free-delivery" }), expect.objectContaining({ id: "flash-sale" })]) });
  });
});

describe("promotion lifecycle scheduler", () => {
  it("requires the cron secret before querying promotions", async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import("@/app/api/internal/promotions/reconcile/route");

    const response = await GET(new Request("https://store.example.test/api/internal/promotions/reconcile"));

    expect(response.status).toBe(401);
    expect(mocks.promotionFindMany).not.toHaveBeenCalled();
  });

  it("reconciles lifecycle states and sends concise staff notifications", async () => {
    process.env.CRON_SECRET = "scheduler-secret";
    mocks.promotionFindMany.mockResolvedValueOnce([{ id: "promotion-start", name: "Flash sale" }]).mockResolvedValueOnce([{ id: "promotion-end", name: "Weekend sale" }]);
    mocks.promotionUpdateMany.mockResolvedValue({ count: 1 });
    const { GET } = await import("@/app/api/internal/promotions/reconcile/route");

    const response = await GET(new Request("https://store.example.test/api/internal/promotions/reconcile", { headers: { authorization: "Bearer scheduler-secret" } }));

    await expect(response.json()).resolves.toEqual({ activated: 1, expired: 1 });
    expect(mocks.promotionUpdateMany).toHaveBeenCalledWith({ where: { id: { in: ["promotion-start"] } }, data: { status: "ACTIVE" } });
    expect(mocks.promotionUpdateMany).toHaveBeenCalledWith({ where: { id: { in: ["promotion-end"] } }, data: { status: "EXPIRED", isActive: false } });
    expect(mocks.notifyStaff).toHaveBeenCalledTimes(2);
  });
});
