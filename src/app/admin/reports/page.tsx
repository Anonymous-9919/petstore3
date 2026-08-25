import { ReportsDashboard } from "@/components/admin/ReportsDashboard";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdminPage } from "@/server/auth";

export default async function ReportsPage() {
  await requireAdminPage("reports");
  return <><PageHeader eyebrow="Operations" title="Reports" description="Filter orders by UTC creation date. Gross order totals are not recognized revenue." /><ReportsDashboard /></>;
}
