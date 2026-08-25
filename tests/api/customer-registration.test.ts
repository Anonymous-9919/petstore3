import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  createCustomerSession: vi.fn(),
  transaction: vi.fn(),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  customerFindFirst: vi.fn(),
  customerCreate: vi.fn(),
  customerUpdate: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  CUSTOMER_SESSION_COOKIE: "petstore_customer_session",
  hashPassword: mocks.hashPassword,
  createCustomerSession: mocks.createCustomerSession,
}));
vi.mock("@/server/db", () => ({ db: { $transaction: mocks.transaction } }));

describe("customer registration identity", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.hashPassword.mockResolvedValue("password-hash");
    mocks.createCustomerSession.mockResolvedValue({ token: "opaque-token", expiresAt: new Date("2030-01-01T00:00:00Z") });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      user: { findUnique: mocks.userFindUnique, create: mocks.userCreate },
      customer: { findFirst: mocks.customerFindFirst, create: mocks.customerCreate, update: mocks.customerUpdate },
    }));
    mocks.userFindUnique.mockResolvedValue(null);
  });

  it("does not attach an existing guest customer solely because the phone matches", async () => {
    mocks.customerFindFirst.mockResolvedValue({ id: "guest-customer" });
    const { POST } = await import("@/app/api/customer/register/route");
    const response = await POST(registrationRequest("00965 5123 4567"));

    expect(response.status).toBe(409);
    expect(mocks.customerFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { phone: { in: ["+96551234567", "96551234567", "0096551234567", "51234567"] } },
    }));
    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(mocks.customerUpdate).not.toHaveBeenCalled();
  });

  it("stores a canonical phone when creating a genuinely new account", async () => {
    mocks.customerFindFirst.mockResolvedValue(null);
    mocks.userCreate.mockResolvedValue({ id: "new-user" });
    const { POST } = await import("@/app/api/customer/register/route");
    const response = await POST(registrationRequest("5123-4567"));

    expect(response.status).toBe(201);
    expect(mocks.customerCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ phone: "+96551234567", userId: "new-user" }) });
    expect(mocks.createCustomerSession).toHaveBeenCalledWith("new-user");
  });
});

function registrationRequest(phone: string) {
  return new Request("https://store.example.test/api/customer/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Aisha Ali", email: "AISHA@example.com", phone, password: "password-123" }),
  });
}
