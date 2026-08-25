import { StaffManager } from "@/components/admin/StaffManager";
import type { UserRole } from "@prisma/client";
import { requireAdminPage } from "@/server/auth";
import { db } from "@/server/db";

type StaffRole = Exclude<UserRole, "CUSTOMER">;

export default async function AdminStaffPage() {
  await requireAdminPage("users");
  const staff = await db.user.findMany({
    where: { role: { not: "CUSTOMER" } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });
  const initialStaff = staff.map((member) => ({ ...member, role: member.role as StaffRole, createdAt: member.createdAt.toISOString() }));
  return <><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Access control</p><h1 className="mt-1 text-3xl font-bold">Staff & roles</h1></div><div className="mt-6"><StaffManager initialStaff={initialStaff} /></div></>;
}
