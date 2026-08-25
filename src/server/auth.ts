import "server-only";

import { createHash, randomBytes } from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import type { User, UserRole } from "@prisma/client";
import { db } from "@/server/db";

export const SESSION_COOKIE = "petstore_admin_session";
export const CUSTOMER_SESSION_COOKIE = "petstore_customer_session";
const SESSION_DAYS = 14;
const STAFF_ROLES = ["OWNER", "MANAGER", "ORDER_STAFF", "INVENTORY_STAFF", "CONTENT_MANAGER", "VIEWER"] satisfies UserRole[];

export type AdminResource = "dashboard" | "notifications" | "orders" | "catalog" | "inventory" | "delivery" | "settings" | "users" | "governance" | "marketing" | "homepage" | "reports";
type AdminAction = "read" | "write";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { userId, tokenHash: tokenHash(token), expiresAt } });
  return { token, expiresAt };
}

export async function createAdminSession(userId: string) {
  const user = await db.user.findFirst({ where: { id: userId, status: "ACTIVE", role: { in: STAFF_ROLES } }, select: { id: true } });
  if (!user) throw new Error("ADMIN_SESSION_NOT_ALLOWED");
  return createSession(user.id);
}

export async function createCustomerSession(userId: string) {
  const user = await db.user.findFirst({ where: { id: userId, status: "ACTIVE", role: "CUSTOMER", customer: { isNot: null } }, select: { id: true } });
  if (!user) throw new Error("CUSTOMER_SESSION_NOT_ALLOWED");
  return createSession(user.id);
}

export async function destroySession(token: string) {
  await db.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
}

type AdminUser = Pick<User, "id" | "name" | "role">;

const getCurrentUser = cache(async (): Promise<AdminUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findFirst({
    where: {
      tokenHash: tokenHash(token),
      expiresAt: { gt: new Date() },
      user: { status: "ACTIVE", role: { in: STAFF_ROLES } },
    },
    select: { user: { select: { id: true, name: true, role: true } } },
  });
  return session?.user ?? null;
});

export async function currentUser() {
  return getCurrentUser();
}

export async function currentCustomer() {
  const token = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findFirst({
    where: {
      tokenHash: tokenHash(token),
      expiresAt: { gt: new Date() },
      user: { status: "ACTIVE", role: "CUSTOMER" },
    },
    include: { user: { include: { customer: true } } },
  });
  return session?.user.customer ?? null;
}

export function isStaff(role: UserRole) {
  return STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]);
}

export function canManage(role: UserRole, resource: AdminResource) {
  if (role === "OWNER") return true;
  if (resource === "governance") return false;
  if (role === "MANAGER") return resource !== "users";
  if (role === "ORDER_STAFF") return resource === "orders";
  if (role === "INVENTORY_STAFF") return resource === "catalog" || resource === "inventory";
  if (role === "CONTENT_MANAGER") return resource === "catalog" || resource === "marketing" || resource === "homepage";
  return false;
}

export function canAccess(role: UserRole, resource: AdminResource) {
  if (canManage(role, resource)) return true;
  return role === "VIEWER" && ["dashboard", "reports", "catalog", "orders", "inventory"].includes(resource);
}

export async function requireAdminPage(resource?: AdminResource) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  if (resource && !canAccess(user.role, resource)) redirect("/admin");
  return user;
}

type AdminApiAuthorization =
  | { authorized: true; user: AdminUser }
  | { authorized: false; response: NextResponse };

export async function authorizeAdminApi(resource?: AdminResource, action: AdminAction = "write"): Promise<AdminApiAuthorization> {
  const user = await currentUser();
  if (!user) {
    return { authorized: false, response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }
  if ((resource && !(action === "read" ? canAccess(user.role, resource) : canManage(user.role, resource))) || (!resource && action === "write" && user.role === "VIEWER")) {
    return { authorized: false, response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }
  return { authorized: true, user };
}
