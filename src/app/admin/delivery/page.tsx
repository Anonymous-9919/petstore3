import { DeliveryManager } from "@/components/admin/DeliveryManager";
import { requireAdminPage } from "@/server/auth";
import { db } from "@/server/db";

export default async function AdminDeliveryPage() {
  await requireAdminPage("delivery");

  const branches = await db.branch.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, nameAr: true, isActive: true, deliveryEnabled: true,
      coverage: {
        orderBy: [{ priority: "asc" }, { area: { name: "asc" } }],
        select: { id: true, isActive: true, deliveryFee: true, minimumOrderValue: true, priority: true, area: { select: { name: true, nameAr: true, province: { select: { name: true, nameAr: true } } } } },
      },
    },
  });
  const serializableBranches = branches.map((branch) => ({ ...branch, coverage: branch.coverage.map((coverage) => ({ ...coverage, deliveryFee: coverage.deliveryFee.toString(), minimumOrderValue: coverage.minimumOrderValue.toString() })) }));

  return <><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Operations</p><h1 className="mt-1 text-3xl font-bold">Delivery coverage</h1><p className="mt-2 text-sm text-[#666]">Enable branches and set area-specific delivery rules.</p></div><DeliveryManager branches={serializableBranches} /></>;
}
