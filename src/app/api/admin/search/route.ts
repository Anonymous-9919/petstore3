import { NextResponse } from "next/server";
import { authorizeAdminApi, canAccess } from "@/server/auth";
import { db } from "@/server/db";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;
const RESULTS_PER_TYPE = 6;
const MAX_RESULTS = 18;

type SearchResult = { type: "product" | "category" | "order" | "customer"; label: string; detail: string; href: string };

export async function GET(request: Request) {
  const authorization = await authorizeAdminApi(undefined, "read");
  if (!authorization.authorized) return authorization.response;

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: `Search queries must be between ${MIN_QUERY_LENGTH} and ${MAX_QUERY_LENGTH} characters.` }, { status: 400 });
  }

  const { role } = authorization.user;
  const [products, categories, orders, customers] = await Promise.all([
    canAccess(role, "catalog")
      ? db.product.findMany({
        where: { archivedAt: null, OR: [{ name: { contains: query, mode: "insensitive" } }, { sku: { contains: query, mode: "insensitive" } }] },
        select: { name: true, sku: true, category: { select: { name: true } } },
        orderBy: { name: "asc" },
        take: RESULTS_PER_TYPE,
      })
      : [],
    canAccess(role, "catalog")
      ? db.category.findMany({
        where: { archivedAt: null, name: { contains: query, mode: "insensitive" } },
        select: { name: true },
        orderBy: { name: "asc" },
        take: RESULTS_PER_TYPE,
      })
      : [],
    canAccess(role, "orders")
      ? db.order.findMany({
        where: { OR: [{ orderNumber: { contains: query, mode: "insensitive" } }, { contactName: { contains: query, mode: "insensitive" } }, { contactPhone: { contains: query } }] },
        select: { orderNumber: true, contactName: true, contactPhone: true },
        orderBy: { createdAt: "desc" },
        take: RESULTS_PER_TYPE,
      })
      : [],
    canAccess(role, "users")
      ? db.customer.findMany({
        where: { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }, { phone: { contains: query } }] },
        select: { id: true, name: true, email: true, phone: true },
        orderBy: { createdAt: "desc" },
        take: RESULTS_PER_TYPE,
      })
      : [],
  ]);

  const results: SearchResult[] = [
    ...products.map((product) => ({ type: "product" as const, label: product.name, detail: [product.sku && `SKU: ${product.sku}`, product.category.name].filter(Boolean).join(" | "), href: `/admin/products?query=${encodeURIComponent(product.sku ?? product.name)}` })),
    ...categories.map((category) => ({ type: "category" as const, label: category.name, detail: "Category", href: "/admin/categories" })),
    ...orders.map((order) => ({ type: "order" as const, label: order.orderNumber, detail: `${order.contactName} | ${order.contactPhone}`, href: "/admin/orders" })),
    ...customers.map((customer) => ({ type: "customer" as const, label: customer.name, detail: `${customer.email ?? "No email"} | ${customer.phone}`, href: `/admin/customers/${customer.id}` })),
  ].slice(0, MAX_RESULTS);

  return NextResponse.json({ results });
}
