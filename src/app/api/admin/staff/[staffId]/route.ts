import { NextResponse } from "next/server";
import { authorizeAdminApi, hashPassword } from "@/server/auth";
import { db } from "@/server/db";
import { updateStaffSchema } from "@/server/validation/users";

export async function PATCH(request: Request, context: { params: Promise<{ staffId: string }> }) {
  const authorization = await authorizeAdminApi("users");
  if (!authorization.authorized) return authorization.response;
  const actor = authorization.user;
  const parsed = updateStaffSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid staff member." }, { status: 400 });
  const { staffId } = await context.params;

  try {
    const staff = await db.$transaction(async (tx) => {
      const existing = await tx.user.findFirst({ where: { id: staffId, role: { not: "CUSTOMER" } } });
      if (!existing) throw new Error("Staff member not found.");
      const removesOwnerAccess = existing.role === "OWNER" && (parsed.data.role !== "OWNER" || parsed.data.status === "DISABLED");
      if (removesOwnerAccess && await tx.user.count({ where: { role: "OWNER", status: "ACTIVE" } }) <= 1) throw new Error("At least one active owner is required.");
      const updated = await tx.user.update({
        where: { id: staffId },
        data: { name: parsed.data.name, email: parsed.data.email.toLowerCase(), role: parsed.data.role, status: parsed.data.status, ...(parsed.data.password ? { passwordHash: await hashPassword(parsed.data.password) } : {}) },
      });
      const credentialsChanged = existing.email !== updated.email || existing.role !== updated.role || existing.status !== updated.status || Boolean(parsed.data.password);
      if (credentialsChanged) await tx.session.deleteMany({ where: { userId: updated.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "staff.updated", entityType: "user", entityId: updated.id, before: { name: existing.name, email: existing.email, role: existing.role, status: existing.status }, after: { name: updated.name, email: updated.email, role: updated.role, status: updated.status } } });
      return updated;
    });
    return NextResponse.json({ id: staff.id, name: staff.name, email: staff.email, role: staff.role, status: staff.status, createdAt: staff.createdAt, updatedAt: staff.updatedAt });
  } catch (error) {
    console.error("Unable to update staff member.", error);
    const message = error instanceof Error && ["Staff member not found.", "At least one active owner is required."].includes(error.message) ? error.message : "Unable to update staff member.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
