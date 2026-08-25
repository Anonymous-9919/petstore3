import { NextResponse } from "next/server";
import { authorizeAdminApi, hashPassword } from "@/server/auth";
import { db } from "@/server/db";
import { createStaffSchema } from "@/server/validation/users";

export async function GET() {
  const authorization = await authorizeAdminApi("users");
  if (!authorization.authorized) return authorization.response;
  const staff = await db.user.findMany({
    where: { role: { not: "CUSTOMER" } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json(staff);
}

export async function POST(request: Request) {
  const authorization = await authorizeAdminApi("users");
  if (!authorization.authorized) return authorization.response;
  const actor = authorization.user;
  const parsed = createStaffSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid staff member." }, { status: 400 });

  try {
    const staff = await db.$transaction(async (tx) => {
      const { password, ...data } = parsed.data;
      const created = await tx.user.create({ data: { ...data, email: data.email.toLowerCase(), passwordHash: await hashPassword(password) } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "staff.created", entityType: "user", entityId: created.id, after: { name: created.name, email: created.email, role: created.role } } });
      return created;
    });
    return NextResponse.json({ id: staff.id, name: staff.name, email: staff.email, role: staff.role, status: staff.status, createdAt: staff.createdAt, updatedAt: staff.updatedAt }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }
}
