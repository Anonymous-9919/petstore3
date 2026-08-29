import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(), canManage: vi.fn(), requestOrderRefund: vi.fn(), transitionCashOrder: vi.fn(), transitionOperationalOrder: vi.fn(), notifyOrderStatusChanged: vi.fn(), notifyStaff: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ currentUser: mocks.currentUser, canManage: mocks.canManage }));
vi.mock("@/server/services/payments", () => ({ requestOrderRefund: mocks.requestOrderRefund, transitionCashOrder: mocks.transitionCashOrder, transitionOperationalOrder: mocks.transitionOperationalOrder }));
vi.mock("@/server/notifications/email", () => ({ notifyOrderStatusChanged: mocks.notifyOrderStatusChanged }));
vi.mock("@/server/notifications/staff", () => ({ notifyStaff: mocks.notifyStaff }));

describe("admin order operations", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.currentUser.mockResolvedValue({ id: "staff-1", role: "MANAGER" });
    mocks.canManage.mockReturnValue(true);
    mocks.requestOrderRefund.mockResolvedValue({ order: { id: "order-1", orderNumber: "PS-1", status: "REFUND_REQUESTED" }, email: "customer@example.test", changed: true });
  });

  it("requires a reason and delegates a refund request to the guarded service", async () => {
    const { PATCH } = await import("@/app/api/admin/orders/[orderId]/route");
    const response = await PATCH(new Request("https://store.example.test/api/admin/orders/order-1", { method: "PATCH", body: JSON.stringify({ status: "REFUND_REQUESTED", reason: "Damaged delivery" }) }), { params: Promise.resolve({ orderId: "order-1" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: "order-1", status: "REFUND_REQUESTED" });
    expect(mocks.requestOrderRefund).toHaveBeenCalledWith({ orderId: "order-1", actorId: "staff-1", reason: "Damaged delivery" });
    expect(mocks.notifyOrderStatusChanged).toHaveBeenCalledOnce();
  });

  it("rejects a refund request without an operational reason", async () => {
    const { PATCH } = await import("@/app/api/admin/orders/[orderId]/route");
    const response = await PATCH(new Request("https://store.example.test/api/admin/orders/order-1", { method: "PATCH", body: JSON.stringify({ status: "REFUND_REQUESTED" }) }), { params: Promise.resolve({ orderId: "order-1" }) });

    expect(response.status).toBe(400);
    expect(mocks.requestOrderRefund).not.toHaveBeenCalled();
  });
});
