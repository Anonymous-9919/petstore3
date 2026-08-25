import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authorizeAdminApi: vi.fn(), hashPassword: vi.fn(), transaction: vi.fn() }));

vi.mock("@/server/auth", () => ({ authorizeAdminApi: mocks.authorizeAdminApi, hashPassword: mocks.hashPassword }));
vi.mock("@/server/db", () => ({ db: { $transaction: mocks.transaction } }));

describe("staff credential changes", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.authorizeAdminApi.mockReset(); mocks.hashPassword.mockReset(); mocks.transaction.mockReset();
    mocks.authorizeAdminApi.mockResolvedValue({ authorized: true, user: { id: "actor-id" } });
    mocks.hashPassword.mockResolvedValue("new-hash");
  });

  it("revokes every target session when password, role, status, or email changes", async () => {
    const tx = {
      user: {
        findFirst: vi.fn().mockResolvedValue({ id: "staff-id", name: "Staff", email: "staff@example.test", role: "MANAGER", status: "ACTIVE" }),
        count: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: "staff-id", name: "Staff", email: "staff@example.test", role: "MANAGER", status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() }),
      },
      session: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
      auditLog: { create: vi.fn() },
    };
    mocks.transaction.mockImplementation((work) => work(tx));
    const { PATCH } = await import("@/app/api/admin/staff/[staffId]/route");
    const response = await PATCH(new Request("https://store.example.test/api/admin/staff/staff-id", { method: "PATCH", body: JSON.stringify({ name: "Staff", email: "staff@example.test", password: "new-password", role: "MANAGER", status: "ACTIVE" }) }), { params: Promise.resolve({ staffId: "staff-id" }) });

    expect(response.status).toBe(200);
    expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "staff-id" } });
  });

  it("does not expose unexpected database errors", async () => {
    mocks.transaction.mockRejectedValue(new Error("Database host db.internal is unavailable"));
    const { PATCH } = await import("@/app/api/admin/staff/[staffId]/route");
    const response = await PATCH(new Request("https://store.example.test/api/admin/staff/staff-id", { method: "PATCH", body: JSON.stringify({ name: "Staff", email: "staff@example.test", role: "MANAGER", status: "ACTIVE" }) }), { params: Promise.resolve({ staffId: "staff-id" }) });

    await expect(response.json()).resolves.toEqual({ error: "Unable to update staff member." });
  });
});
