import { NotificationsCenter } from "@/components/admin/NotificationsCenter";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdminPage } from "@/server/auth";

export default async function NotificationsPage() {
  await requireAdminPage("notifications");
  return <><PageHeader eyebrow="Workspace" title="Notifications" description="Updates from orders, inventory, and catalog imports." /><NotificationsCenter /></>;
}
