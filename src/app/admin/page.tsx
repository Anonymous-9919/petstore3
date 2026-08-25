import { canAccess, requireAdminPage } from "@/server/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { DashboardMetrics } from "@/components/admin/DashboardMetrics";
import { db } from "@/server/db";

function Card({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-black/10 bg-white p-5"><p className="text-sm text-[#666]">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>;
}

export default async function AdminOverviewPage() {
   const user = await requireAdminPage("dashboard");
   const canViewOrders = canAccess(user.role, "orders");
   const canViewInventory = canAccess(user.role, "inventory");
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const [orderSummary, lowStock] = await Promise.all([
    canViewOrders ? Promise.all([
      db.order.count({ where: { createdAt: { gte: start } } }),
      db.order.count({ where: { status: { in: ["NEW", "ASSIGNED_TO_BRANCH", "ASSIGNED_TO_DRIVER"] } } }),
      db.order.count({ where: { status: "DELIVERED", createdAt: { gte: start } } }),
      db.order.findMany({ take: 8, orderBy: { createdAt: "desc" }, select: { orderNumber: true, contactName: true, total: true, status: true, createdAt: true } }),
    ]) : null,
    canViewInventory ? db.inventoryLevel.count({ where: { quantity: { lte: 5 } } }) : null,
  ]);
  const [todayOrders, pending, delivered, recent] = orderSummary ?? [];
   return <><PageHeader eyebrow="Operations" title="Today&apos;s overview" /><DashboardMetrics /><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{orderSummary && <><Card label="Today's orders" value={todayOrders!}/><Card label="Pending operations" value={pending!}/><Card label="Delivered today" value={delivered!}/></>}{lowStock !== null && <Card label="Low stock levels" value={lowStock}/>}</div>{orderSummary && <div className="mt-6 rounded-xl border border-black/10 bg-white"><h2 className="border-b border-black/10 px-5 py-4 text-lg font-bold">Recent orders</h2><div className="divide-y divide-black/5">{recent!.length ? recent!.map((order) => <div key={order.orderNumber} className="flex justify-between px-5 py-4 text-sm"><span><b>{order.orderNumber}</b><span className="ml-2 text-[#666]">{order.contactName}</span></span><span>{order.total.toString()} KD | {order.status}</span></div>) : <p className="px-5 py-8 text-sm text-[#666]">Orders will appear here after checkout is connected to your migrated database.</p>}</div></div>}</>;
}
