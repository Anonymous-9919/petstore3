import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ productFindMany: vi.fn() }));

vi.mock("@/server/db", () => ({ db: { product: { findMany: mocks.productFindMany } } }));
vi.mock("@/server/services/fulfillment", () => ({ isValidFulfillmentSlot: vi.fn() }));
vi.mock("@/server/notifications/email", () => ({ notifyOrderCreated: vi.fn() }));

describe("checkout catalog availability", () => {
  it("only resolves products whose parent category remains active and unarchived", async () => {
    mocks.productFindMany.mockResolvedValue([]);
    const { CheckoutError, quoteCheckout } = await import("@/server/services/checkout");

    await expect(quoteCheckout({
      items: [{ productId: 10, quantity: 1, optionValueIds: [] }],
      mode: "pickup",
      branchId: 1,
      areaId: null,
      address: null,
      paymentMethod: "cash",
      contact: { name: "Aisha", phone: "+96551234567", email: "aisha@example.com" },
    })).rejects.toBeInstanceOf(CheckoutError);

    expect(mocks.productFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ category: { isActive: true, archivedAt: null } }),
    }));
  });
});
