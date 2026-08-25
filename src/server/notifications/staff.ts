import "server-only";

import type { UserRole } from "@prisma/client";
import { db } from "@/server/db";

const staffRoles: UserRole[] = ["OWNER", "MANAGER", "ORDER_STAFF", "INVENTORY_STAFF", "CONTENT_MANAGER"];

type StaffNotification = {
  title: string;
  body?: string;
  href?: string;
  roles?: UserRole[];
  excludeUserId?: string;
};

export async function notifyStaff({ roles = staffRoles, excludeUserId, ...notification }: StaffNotification) {
  try {
    const recipients = await db.user.findMany({
      where: { status: "ACTIVE", role: { in: roles }, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
      select: { id: true },
    });
    if (recipients.length) await db.notification.createMany({ data: recipients.map(({ id }) => ({ userId: id, ...notification })) });
  } catch {
    // Notifications are advisory and must not interrupt order or inventory workflows.
  }
}
