import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  adminFindUnique: vi.fn(),
  customerFindFirst: vi.fn(),
}));

vi.mock("bcryptjs", () => ({ compare: vi.fn(), hash: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/db", () => ({
  db: {
    user: {
      findUnique: mocks.adminFindUnique,
      findFirst: mocks.customerFindFirst,
    },
    session: { create: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn() },
  },
}));

describe("login route throttling", () => {
  it.each([
    { realm: "admin", path: "@/app/api/admin/session/route", email: "limited-admin@example.com", ip: "192.0.2.21" },
    { realm: "customer", path: "@/app/api/customer/session/route", email: "limited-customer@example.com", ip: "192.0.2.22" },
  ])("returns 429 with Retry-After for repeated $realm failures", async ({ path, email, ip }) => {
    mocks.adminFindUnique.mockResolvedValue(null);
    mocks.customerFindFirst.mockResolvedValue(null);
    const route = path.includes("admin")
      ? await import("@/app/api/admin/session/route")
      : await import("@/app/api/customer/session/route");
    const request = () => new Request(`https://store.example.test/api/${path.includes("admin") ? "admin" : "customer"}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ email, password: "wrong-password" }),
    });

    for (let attempt = 0; attempt < 8; attempt += 1) {
      expect((await route.POST(request())).status).toBe(401);
    }
    const blocked = await route.POST(request());

    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});
