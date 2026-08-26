import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  expireOrder: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: { inventoryReservation: { findMany: mocks.findMany } },
}));
vi.mock("@/server/services/payments", () => ({
  expireOnlineReservationOrder: mocks.expireOrder,
}));
vi.mock("next/server", () => ({ NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } }));

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("reservation expiry scheduler", () => {
  it("requires a configured bearer secret before querying reservations", async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import("@/app/api/internal/reservations/expire/route");

    const response = await GET(new Request("https://store.example.test/api/internal/reservations/expire"));

    expect(response.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("caps externally requested batches and reports order-level outcomes", async () => {
    process.env.CRON_SECRET = "scheduler-secret";
    mocks.findMany.mockResolvedValueOnce([
      { orderId: "order-1" },
      { orderId: "order-2" },
      { orderId: "order-3" },
    ]);
    mocks.expireOrder
      .mockResolvedValueOnce({ outcome: "expired", releasedReservations: 2 })
      .mockResolvedValueOnce({ outcome: "skipped", releasedReservations: 0 })
      .mockRejectedValueOnce(new Error("transaction conflict"));
    const { GET } = await import("@/app/api/internal/reservations/expire/route");

    const response = await GET(new Request(
      "https://store.example.test/api/internal/reservations/expire?limit=1000",
      { headers: { authorization: "Bearer scheduler-secret" } },
    ));

    expect(response.status).toBe(503);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100, distinct: ["orderId"] }));
    await expect(response.json()).resolves.toMatchObject({
      batchSize: 100,
      candidateOrders: 3,
      processedOrders: 2,
      expiredOrders: 1,
      releasedReservations: 2,
      skippedOrders: 1,
      failedOrders: 1,
      hasMore: false,
    });
    expect(mocks.expireOrder).toHaveBeenCalledTimes(3);
  });
});
