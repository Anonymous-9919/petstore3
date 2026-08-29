import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authorizeAdminApi: vi.fn(), transaction: vi.fn() }));

vi.mock("@/server/auth", () => ({ authorizeAdminApi: mocks.authorizeAdminApi }));
vi.mock("@/server/db", () => ({ db: { $transaction: mocks.transaction } }));
vi.mock("@/server/catalog-cache", () => ({ revalidateStorefrontCatalog: vi.fn() }));

describe("admin inventory transfer API", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.authorizeAdminApi.mockReset();
    mocks.authorizeAdminApi.mockResolvedValue({ authorized: true, user: { id: "e87b9df3-86b2-4b8c-a8ff-b4443e51e6bb" } });
    mocks.transaction.mockReset();
  });

  it("dispatches only draft transfers and records the stock movement", async () => {
    const tx = {
      inventoryTransfer: {
        findUnique: vi.fn().mockResolvedValue({ id: "4543449c-5211-476e-9463-cb597653657f", transferNumber: "TRF-1", status: "DRAFT", sourceBranchId: "de8ee636-f2e3-43db-a34a-7d6536bd50bb", destinationBranchId: "a5cf0a0c-fdb0-4271-bc65-72f8ab196b9f", lines: [{ productId: "970ee4b1-41c9-4eb3-b6fb-cb5a16ce81d9", variantId: "b5cf0a0c-fdb0-4271-bc65-72f8ab196b9f", quantity: 2 }] }),
        update: vi.fn().mockResolvedValue({ id: "4543449c-5211-476e-9463-cb597653657f", status: "IN_TRANSIT" }),
      },
      $queryRaw: vi.fn().mockResolvedValue([{ id: "level-1", quantity: 8 }]),
      inventoryMovement: { create: vi.fn().mockResolvedValue({}) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    mocks.transaction.mockImplementation((work) => work(tx));
    const { PATCH } = await import("@/app/api/admin/inventory/transfers/[transferId]/route");
    const response = await PATCH(new Request("https://store.example.test/api/admin/inventory/transfers/4543449c-5211-476e-9463-cb597653657f", { method: "PATCH", body: JSON.stringify({ action: "dispatch" }) }), { params: Promise.resolve({ transferId: "4543449c-5211-476e-9463-cb597653657f" }) });

    expect(response.status).toBe(200);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: "TRANSFER_OUT", quantity: -2, beforeQuantity: 10, afterQuantity: 8, reason: "TRANSFER_DISPATCH" }) });
    expect(tx.inventoryTransfer.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "IN_TRANSIT", dispatchedAt: expect.any(Date) }) }));
  });

  it("rejects a receive action before any inventory change unless the transfer is in transit", async () => {
    const tx = { inventoryTransfer: { findUnique: vi.fn().mockResolvedValue({ id: "4543449c-5211-476e-9463-cb597653657f", status: "DRAFT", lines: [] }) } };
    mocks.transaction.mockImplementation((work) => work(tx));
    const { PATCH } = await import("@/app/api/admin/inventory/transfers/[transferId]/route");
    const response = await PATCH(new Request("https://store.example.test/api/admin/inventory/transfers/4543449c-5211-476e-9463-cb597653657f", { method: "PATCH", body: JSON.stringify({ action: "receive" }) }), { params: Promise.resolve({ transferId: "4543449c-5211-476e-9463-cb597653657f" }) });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Transfer cannot be received from DRAFT." });
  });

  it("rejects transfer lines that resolve to the same default variant", async () => {
    const productId = "970ee4b1-41c9-4eb3-b6fb-cb5a16ce81d9";
    const variantId = "b5cf0a0c-fdb0-4271-bc65-72f8ab196b9f";
    const tx = {
      branch: { count: vi.fn().mockResolvedValue(2) },
      product: { findMany: vi.fn().mockResolvedValue([{ id: productId }]) },
      productVariant: { findMany: vi.fn().mockResolvedValue([{ id: variantId, productId }]) },
    };
    mocks.transaction.mockImplementation((work) => work(tx));
    const { POST } = await import("@/app/api/admin/inventory/transfers/route");
    const response = await POST(new Request("https://store.example.test/api/admin/inventory/transfers", { method: "POST", body: JSON.stringify({ sourceBranchId: "de8ee636-f2e3-43db-a34a-7d6536bd50bb", destinationBranchId: "a5cf0a0c-fdb0-4271-bc65-72f8ab196b9f", lines: [{ productId, quantity: 1 }, { productId, variantId, quantity: 1 }] }) }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "A variant can appear only once in a transfer." });
  });
});
