import { OrderActions } from "@/components/admin/OrderActions";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import Link from "next/link";
import { canManage, requireAdminPage } from "@/server/auth";
import { db } from "@/server/db";

const PAGE_SIZE = 50;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireAdminPage("orders");
  const rawPage = Number((await searchParams).page);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const [orders, total] = await Promise.all([
    db.order.findMany({ skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, orderBy: { createdAt: "desc" }, select: { id: true, orderNumber: true, contactName: true, status: true, total: true, branch: { select: { name: true } } } }),
    db.order.count(),
  ]);
  const hasNextPage = page * PAGE_SIZE < total;
  const canUpdateOrders = canManage(user.role, "orders");
  return <><PageHeader eyebrow="Operations" title="Orders" />{orders.length === 0 ? <div className="mt-6"><EmptyState title="No orders yet" description="New orders will appear here when checkout is connected to the migrated database." /></div> : <><div className="mt-6 overflow-x-auto rounded-xl border border-black/10 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-black/10 text-[#666]"><tr><th className="px-4 py-3">Order</th><th>Customer</th><th>Branch</th><th>Status</th><th>Total</th>{canUpdateOrders && <th className="px-4">Action</th>}</tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-b border-black/5"><td className="px-4 py-3 font-semibold">{order.orderNumber}</td><td>{order.contactName}</td><td>{order.branch?.name ?? "Unassigned"}</td><td><StatusBadge tone={order.status === "DELIVERED" ? "success" : order.status === "NEW" ? "warning" : "neutral"}>{order.status.replaceAll("_", " ")}</StatusBadge></td><td>{order.total.toString()} KD</td>{canUpdateOrders && <td className="px-4">{order.status === "NEW" && <OrderActions orderId={order.id}/>}</td>}</tr>)}</tbody></table></div><Pagination page={page} hasNextPage={hasNextPage} /></>}</>;
}

function Pagination({ page, hasNextPage }: { page: number; hasNextPage: boolean }) {
  return <nav aria-label="Orders pagination" className="mt-4 flex items-center justify-end gap-3 text-sm"><span className="text-[#666]">Page {page}</span>{page > 1 && <Link href={`/admin/orders?page=${page - 1}`} className="rounded border border-black/15 px-3 py-2 font-semibold">Previous</Link>}{hasNextPage && <Link href={`/admin/orders?page=${page + 1}`} className="rounded border border-black/15 px-3 py-2 font-semibold">Next</Link>}</nav>;
}
