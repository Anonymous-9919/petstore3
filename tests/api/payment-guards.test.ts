import { Prisma } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db", () => ({ db: { order: { findFirst: vi.fn() } } }));
vi.mock("@/server/services/payments", () => ({ settleKnetPayment: vi.fn() }));
vi.mock("next/server", () => ({ NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } }));

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("payment route guards", () => {
  it("rejects real KNET initiation before reading an order even when credentials are present", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.ALLOW_MOCK_PAYMENTS;
    process.env.KNET_MERCHANT_ID = "configured-but-disabled";
    process.env.KNET_MERCHANT_PASSWORD = "configured-but-disabled";
    const { POST } = await import("@/app/api/knet/init/route");

    const response = await POST(new Request("https://store.example.test/api/knet/init", { method: "POST" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Online payment is not configured." });
    const { db } = await import("@/server/db");
    expect(db.order.findFirst).not.toHaveBeenCalled();
  });

  it("keeps mock payment completion disabled unless explicitly enabled", async () => {
    delete process.env.ALLOW_MOCK_PAYMENTS;
    const { POST } = await import("@/app/api/payments/mock/complete/route");

    const response = await POST(new Request("https://store.example.test/api/payments/mock/complete", { method: "POST" }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Mock payments are disabled." });
  });

  it("disables real gateway callbacks even when mock mode is enabled", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.ALLOW_MOCK_PAYMENTS = "true";
    const { GET } = await import("@/app/api/knet/response/route");

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.text()).resolves.toBe("KNET is not enabled.");
    const { settleKnetPayment } = await import("@/server/services/payments");
    expect(settleKnetPayment).not.toHaveBeenCalled();
  });

  it("binds mock completion to server-loaded order and payment context", async () => {
    process.env.ALLOW_MOCK_PAYMENTS = "true";
    const { db } = await import("@/server/db");
    const { settleKnetPayment } = await import("@/server/services/payments");
    vi.mocked(db.order.findFirst).mockResolvedValueOnce({
      id: "00000000-0000-4000-8000-000000000001",
      trackingToken: "tracking-token-with-enough-entropy",
      payments: [{
        id: "00000000-0000-4000-8000-000000000002",
        merchantTrackId: "PAY-TEST-1",
        amount: new Prisma.Decimal("12.500"),
        currencyCode: "KWD",
      }],
    } as never);
    vi.mocked(settleKnetPayment).mockResolvedValueOnce({
      orderNumber: "PS-TEST-1",
      trackingToken: "tracking-token-with-enough-entropy",
    } as never);
    const { POST } = await import("@/app/api/payments/mock/complete/route");

    const response = await POST(new Request("https://store.example.test/api/payments/mock/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: "00000000-0000-4000-8000-000000000001",
        trackingToken: "tracking-token-with-enough-entropy",
      }),
    }));

    expect(response.status).toBe(200);
    expect(settleKnetPayment).toHaveBeenCalledWith(expect.objectContaining({
      trackId: "PAY-TEST-1",
      outcome: "CAPTURED",
      context: expect.objectContaining({
        paymentId: "00000000-0000-4000-8000-000000000002",
        orderId: "00000000-0000-4000-8000-000000000001",
        trackingToken: "tracking-token-with-enough-entropy",
        provider: "mock-knet",
        amount: "12.500",
        currencyCode: "KWD",
      }),
      payload: expect.objectContaining({
        result: "CAPTURED",
        trackid: "PAY-TEST-1",
        amt: "12.500",
        currencyCode: "KWD",
      }),
    }));
  });
});
