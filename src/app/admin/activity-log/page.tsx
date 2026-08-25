import { ActivityLog } from "@/components/admin/ActivityLog";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdminPage } from "@/server/auth";

export default async function ActivityLogPage() {
  await requireAdminPage("governance");
  return <><PageHeader eyebrow="Governance" title="Activity log" description="A read-only record of administrative activity. Sensitive change payloads are intentionally omitted." /><ActivityLog /></>;
}
