import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  userFindFirst: vi.fn(),
  sessionCreate: vi.fn(),
  sessionDeleteMany: vi.fn(),
  sessionFindFirst: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mocks.cookieGet })),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
}));
vi.mock("@/server/db", () => ({
  db: {
    user: { findFirst: mocks.userFindFirst },
    session: {
      create: mocks.sessionCreate,
      deleteMany: mocks.sessionDeleteMany,
      findFirst: mocks.sessionFindFirst,
    },
  },
}));

import { canAccess, canManage, createAdminSession, currentUser, isStaff } from "@/server/auth";

describe("admin authorization policy", () => {
  beforeEach(() => {
    mocks.cookieGet.mockReset();
    mocks.userFindFirst.mockReset();
    mocks.sessionCreate.mockReset();
    mocks.sessionFindFirst.mockReset();
  });

  it("never treats customers or drivers as admin staff", () => {
    expect(isStaff("CUSTOMER")).toBe(false);
    expect(isStaff("DRIVER")).toBe(false);
    expect(isStaff("OWNER")).toBe(true);
    expect(isStaff("MANAGER")).toBe(true);
    expect(isStaff("CONTENT_MANAGER")).toBe(true);
    expect(isStaff("VIEWER")).toBe(true);
  });

  it("enforces the resource permission matrix", () => {
    expect(canManage("ORDER_STAFF", "orders")).toBe(true);
    expect(canManage("ORDER_STAFF", "catalog")).toBe(false);
    expect(canManage("INVENTORY_STAFF", "inventory")).toBe(true);
    expect(canManage("INVENTORY_STAFF", "catalog")).toBe(true);
    expect(canManage("INVENTORY_STAFF", "orders")).toBe(false);
    expect(canManage("MANAGER", "settings")).toBe(true);
    expect(canManage("MANAGER", "users")).toBe(false);
    expect(canManage("CONTENT_MANAGER", "catalog")).toBe(true);
    expect(canManage("CONTENT_MANAGER", "marketing")).toBe(true);
    expect(canManage("CONTENT_MANAGER", "orders")).toBe(false);
    expect(canManage("CUSTOMER", "orders")).toBe(false);
    expect(canManage("DRIVER", "orders")).toBe(false);
  });

  it("limits viewers to read-only dashboard, report, catalog, order, and inventory access", () => {
    for (const resource of ["dashboard", "reports", "catalog", "orders", "inventory"] as const) {
      expect(canAccess("VIEWER", resource)).toBe(true);
      expect(canManage("VIEWER", resource)).toBe(false);
    }
    expect(canAccess("VIEWER", "marketing")).toBe(false);
    expect(canAccess("VIEWER", "settings")).toBe(false);
  });

  it("refuses to mint an admin session for a nonstaff user", async () => {
    mocks.userFindFirst.mockResolvedValue(null);

    await expect(createAdminSession("customer-id")).rejects.toThrow("ADMIN_SESSION_NOT_ALLOWED");
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
    expect(mocks.userFindFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ role: { in: ["OWNER", "MANAGER", "ORDER_STAFF", "INVENTORY_STAFF", "CONTENT_MANAGER", "VIEWER"] } }),
    }));
  });

  it("only resolves admin-cookie sessions whose user has an explicit staff role", async () => {
    mocks.cookieGet.mockReturnValue({ value: "opaque-token" });
    mocks.sessionFindFirst.mockResolvedValue(null);

    await expect(currentUser()).resolves.toBeNull();
    expect(mocks.sessionFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        user: { status: "ACTIVE", role: { in: ["OWNER", "MANAGER", "ORDER_STAFF", "INVENTORY_STAFF", "CONTENT_MANAGER", "VIEWER"] } },
      }),
    }));
  });
});
