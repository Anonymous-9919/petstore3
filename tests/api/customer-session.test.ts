import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  compare: vi.fn(),
  userFindFirst: vi.fn(),
  customerFindFirst: vi.fn(),
  customerUpdate: vi.fn(),
  sessionCreate: vi.fn(),
}));

vi.mock("bcryptjs", () => ({ compare: mocks.compare, hash: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/db", () => ({
  db: {
    user: { findFirst: mocks.userFindFirst },
    customer: { findFirst: mocks.customerFindFirst, update: mocks.customerUpdate },
    session: { create: mocks.sessionCreate, deleteMany: vi.fn(), findFirst: vi.fn() },
  },
}));

describe("customer login identity", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
  });

  it("canonicalizes the verified account phone when no other customer owns it", async () => {
    mocks.userFindFirst
      .mockResolvedValueOnce({
        id: "user-id",
        email: "aisha@example.com",
        role: "CUSTOMER",
        status: "ACTIVE",
        passwordHash: "hash",
        customer: { id: "customer-id", phone: "96551234567" },
      })
      .mockResolvedValueOnce({ id: "user-id" });
    mocks.compare.mockResolvedValue(true);
    mocks.customerFindFirst.mockResolvedValue(null);
    mocks.customerUpdate.mockResolvedValue({ id: "customer-id" });
    mocks.sessionCreate.mockResolvedValue({ id: "session-id" });

    const { POST } = await import("@/app/api/customer/session/route");
    const response = await POST(new Request("https://store.example.test/api/customer/session", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.31" },
      body: JSON.stringify({ email: "AISHA@example.com", password: "password-123" }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.customerUpdate).toHaveBeenCalledWith({ where: { id: "customer-id" }, data: { phone: "+96551234567" } });
    expect(mocks.sessionCreate).toHaveBeenCalledOnce();
  });

  it("does not merge or rewrite the profile when the canonical phone is already owned", async () => {
    mocks.userFindFirst
      .mockResolvedValueOnce({
        id: "user-id",
        email: "aisha@example.com",
        role: "CUSTOMER",
        status: "ACTIVE",
        passwordHash: "hash",
        customer: { id: "customer-id", phone: "96551234567" },
      })
      .mockResolvedValueOnce({ id: "user-id" });
    mocks.compare.mockResolvedValue(true);
    mocks.customerFindFirst.mockResolvedValue({ id: "different-customer" });
    mocks.sessionCreate.mockResolvedValue({ id: "session-id" });

    const { POST } = await import("@/app/api/customer/session/route");
    const response = await POST(new Request("https://store.example.test/api/customer/session", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.32" },
      body: JSON.stringify({ email: "aisha@example.com", password: "password-123" }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.customerUpdate).not.toHaveBeenCalled();
    expect(mocks.sessionCreate).toHaveBeenCalledOnce();
  });
});
