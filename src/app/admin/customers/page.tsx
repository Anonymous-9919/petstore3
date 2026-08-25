import Link from "next/link";
import { requireAdminPage } from "@/server/auth";
import { db } from "@/server/db";

const PAGE_SIZE = 50;

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdminPage("users");
  const { q, page: pageParam } = await searchParams;
  const query = q?.trim();
  const rawPage = Number(pageParam);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10_000) : 1;
  const where = query ? { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { email: { contains: query, mode: "insensitive" as const } }, { phone: { contains: query } }] } : undefined;
  const [customers, total] = await Promise.all([
    db.customer.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: { id: true, name: true, email: true, phone: true, user: { select: { status: true } }, _count: { select: { orders: true } } } }),
    db.customer.count({ where }),
  ]);
  const hasNextPage = page * PAGE_SIZE < total;
  const pageHref = (nextPage: number) => `/admin/customers?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(nextPage) })}`;
  return <><div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Customers</p><h1 className="mt-1 text-3xl font-bold">Customer list</h1></div><form className="mt-6 flex max-w-xl gap-2"><input name="q" defaultValue={query} placeholder="Search name, email, or phone" className="min-w-0 flex-1 rounded border border-black/15 bg-white px-3 py-2 text-sm"/><button className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white">Search</button></form><div className="mt-4 overflow-x-auto rounded-xl border border-black/10 bg-white"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-black/10 text-[#666]"><tr><th className="px-4 py-3">Customer</th><th>Email</th><th>Phone</th><th>Orders</th><th>Account</th><th className="px-4"> </th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id} className="border-b border-black/5"><td className="px-4 py-3 font-medium">{customer.name}</td><td>{customer.email ?? "-"}</td><td>{customer.phone}</td><td>{customer._count.orders}</td><td>{customer.user?.status ?? "Guest"}</td><td className="px-4"><Link href={`/admin/customers/${customer.id}`} className="font-semibold text-brand">View</Link></td></tr>)}{customers.length === 0 && <tr><td className="px-4 py-8 text-[#666]" colSpan={6}>No customers found.</td></tr>}</tbody></table></div>{customers.length > 0 && <nav aria-label="Customers pagination" className="mt-4 flex items-center justify-end gap-3 text-sm"><span className="text-[#666]">Page {page}</span>{page > 1 && <Link href={pageHref(page - 1)} className="rounded border border-black/15 px-3 py-2 font-semibold">Previous</Link>}{hasNextPage && <Link href={pageHref(page + 1)} className="rounded border border-black/15 px-3 py-2 font-semibold">Next</Link>}</nav>}</>;
}
