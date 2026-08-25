import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  compare: vi.fn(),
  userFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  sessionCreate: vi.fn(),
  sessionDeleteMany: vi.fn(),
  sessionFindFirst: vi.fn(),
}));

vi.mock("bcryptjs", () => ({ compare: mocks.compare, hash: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/db", () => ({
  db: {
    user: { findUnique: mocks.userFindUnique, findFirst: mocks.userFindFirst },
    session: { create: mocks.sessionCreate, deleteMany: mocks.sessionDeleteMany, findFirst: mocks.sessionFindFirst },
  },
}));

describe("admin session route", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
  });

  it.each(["CUSTOMER", "DRIVER"] as const)("rejects a valid-password %s account without creating a session", async (role) => {
    mocks.userFindUnique.mockResolvedValue({ id: `${role}-id`, email: `${role.toLowerCase()}@example.com`, role, status: "ACTIVE", passwordHash: "hash" });
    const { POST } = await import("@/app/api/admin/session/route");
    const response = await POST(new Request("https://store.example.test/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `192.0.2.${role === "CUSTOMER" ? 10 : 11}` },
      body: JSON.stringify({ email: `${role.toLowerCase()}@example.com`, password: "valid-password" }),
    }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Invalid email or password." });
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
  });

  it("deletes the opaque server session and expires the admin cookie on logout", async () => {
    const { DELETE } = await import("@/app/api/admin/session/route");
    const response = await DELETE(new Request("https://store.example.test/api/admin/session", {
      method: "DELETE",
      headers: { cookie: "petstore_admin_session=opaque-token" },
    }));

    expect(response.status).toBe(200);
    expect(mocks.sessionDeleteMany).toHaveBeenCalledOnce();
    expect(response.headers.get("set-cookie")).toContain("petstore_admin_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
