import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/services/checkout", () => ({
  CheckoutError: class CheckoutError extends Error {},
  quoteCheckout: vi.fn(),
}));
vi.mock("@/server/auth", () => ({ currentCustomer: vi.fn() }));

describe("checkout quote route validation", () => {
  beforeEach(async () => {
    const { quoteCheckout } = await import("@/server/services/checkout");
    vi.mocked(quoteCheckout).mockReset();
  });
  it("returns 400 for an invalid body without invoking checkout services", async () => {
    const { POST } = await import("@/app/api/checkout/quote/route");
    const response = await POST(new Request("https://store.example.test/api/checkout/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid checkout request." });
    const { quoteCheckout } = await import("@/server/services/checkout");
    expect(quoteCheckout).not.toHaveBeenCalled();
  });

  it("returns the automatic promotion and server-calculated discount without caching", async () => {
    const { quoteCheckout } = await import("@/server/services/checkout");
    vi.mocked(quoteCheckout).mockResolvedValue({
      branch: { legacyId: 3 }, coverage: null, lines: [], subtotal: new Prisma.Decimal("10"), deliveryFee: new Prisma.Decimal("1"), discountTotal: new Prisma.Decimal("2"), total: new Prisma.Decimal("9"), promotion: { code: null, name: "Automatic saving" },
    } as never);
    const { POST } = await import("@/app/api/checkout/quote/route");
    const response = await POST(new Request("https://store.example.test/api/checkout/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ productId: 10, quantity: 1 }], mode: "delivery", branchId: 3, areaId: 8, paymentMethod: "cash", contact: { name: "Aisha Ali", phone: "+96512345678" }, address: { type: "home", block: "4", street: "Main", building: "12" } }) }));

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ discountTotal: "2", total: "9", promotion: { code: null, name: "Automatic saving" } });
  });
});
