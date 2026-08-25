import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeAdminApi: vi.fn(), notificationFindMany: vi.fn(), notificationCount: vi.fn(), notificationUpdateMany: vi.fn(),
  auditFindMany: vi.fn(), auditCount: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ authorizeAdminApi: mocks.authorizeAdminApi }));
vi.mock("@/server/db", () => ({ db: {
  notification: { findMany: mocks.notificationFindMany, count: mocks.notificationCount, updateMany: mocks.notificationUpdateMany },
  auditLog: { findMany: mocks.auditFindMany, count: mocks.auditCount },
} }));

describe("admin governance APIs", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.authorizeAdminApi.mockResolvedValue({ authorized: true, user: { id: "user-1", role: "OWNER" } });
    mocks.notificationFindMany.mockResolvedValue([]);
    mocks.notificationCount.mockResolvedValueOnce(12).mockResolvedValueOnce(3);
    mocks.auditFindMany.mockResolvedValue([]);
    mocks.auditCount.mockResolvedValue(51);
  });

  it("lists only the current user's notifications with bounded pagination and unread count", async () => {
    const { GET } = await import("@/app/api/admin/notifications/route");
    const response = await GET(new Request("https://store.example.test/api/admin/notifications?page=2&pageSize=100"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ unread: 3, pagination: { page: 2, pageSize: 50, total: 12, totalPages: 1 } });
    expect(mocks.notificationFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1" }, skip: 50, take: 50 }));
    expect(mocks.notificationCount).toHaveBeenLastCalledWith({ where: { userId: "user-1", readAt: null } });
  });

  it("marks all and individual notifications only for their recipient", async () => {
    mocks.notificationUpdateMany.mockResolvedValue({ count: 1 });
    const notifications = await import("@/app/api/admin/notifications/route");
    const single = await import("@/app/api/admin/notifications/[notificationId]/route");
    await notifications.PATCH(new Request("https://store.example.test/api/admin/notifications", { method: "PATCH", body: JSON.stringify({ action: "mark-all-read" }) }));
    await single.PATCH(new Request("https://store.example.test/api/admin/notifications/notification-2", { method: "PATCH" }), { params: Promise.resolve({ notificationId: "notification-2" }) });

    expect(mocks.notificationUpdateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: { userId: "user-1", readAt: null } }));
    expect(mocks.notificationUpdateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: { id: "notification-2", userId: "user-1", readAt: null } }));
  });

  it("requires governance access and returns audit metadata without payload JSON", async () => {
    mocks.auditFindMany.mockResolvedValue([{ id: "audit-1", action: "staff.updated", entityType: "user", entityId: "user-2", before: { passwordHash: "secret" } }]);
    const { GET } = await import("@/app/api/admin/activity-log/route");
    const response = await GET(new Request("https://store.example.test/api/admin/activity-log?page=3&pageSize=25"));

    expect(mocks.authorizeAdminApi).toHaveBeenCalledWith("governance");
    expect(mocks.auditFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 50, take: 25, select: expect.not.objectContaining({ before: true, after: true }) }));
    await expect(response.json()).resolves.toMatchObject({ pagination: { page: 3, total: 51, totalPages: 3 } });
  });
});
