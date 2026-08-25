import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";

type ReportFilters = { start: Date; end: Date; branchId?: string; categoryId?: string; productId?: string };
type ReportTable = "sales" | "products" | "categories" | "branches" | "customers" | "orders" | "promotions" | "inventory";
const reportTables: ReportTable[] = ["sales", "products", "categories", "branches", "customers", "orders", "promotions", "inventory"];
const DELIVERY_DURATION_LIMIT = 1_000;
const LOW_STOCK_LIMIT = 100;
const FILTER_OPTION_LIMIT = 250;

function parseDate(value: string | null, end = false) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return undefined;
  if (end) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function parseFilters(request: Request): ReportFilters | null {
  const params = new URL(request.url).searchParams;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const defaultStart = new Date(today);
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 29);
  const parsedStart = parseDate(params.get("start"));
  const parsedEnd = parseDate(params.get("end"), true);
  if (parsedStart === undefined || parsedEnd === undefined) return null;
  const start = parsedStart ?? defaultStart;
  const end = parsedEnd ?? new Date(today.getTime() + 86_400_000);
  if (!start || !end || start >= end || end.getTime() - start.getTime() > 366 * 86_400_000) return null;
  const value = (name: string) => params.get(name)?.trim() || undefined;
  return { start, end, branchId: value("branchId"), categoryId: value("categoryId"), productId: value("productId") };
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function previousPeriod(filters: ReportFilters) {
  const duration = filters.end.getTime() - filters.start.getTime();
  return { ...filters, start: new Date(filters.start.getTime() - duration), end: new Date(filters.start.getTime()) };
}

function buildOrderWhere(filters: ReportFilters): Prisma.OrderWhereInput {
  const itemFilter = buildItemFilter(filters);
  return { ...buildBaseOrderWhere(filters), ...(filters.productId || filters.categoryId ? { items: { some: itemFilter } } : {}) };
}

function buildBaseOrderWhere(filters: ReportFilters): Prisma.OrderWhereInput {
  return { createdAt: { gte: filters.start, lt: filters.end }, ...(filters.branchId ? { branchId: filters.branchId } : {}) };
}

function buildItemFilter(filters: ReportFilters): Prisma.OrderItemWhereInput {
  const itemFilter: Prisma.OrderItemWhereInput = {
    ...(filters.productId ? { productId: filters.productId } : {}),
    ...(filters.categoryId ? { product: { categoryId: filters.categoryId } } : {}),
  };
  return itemFilter;
}

async function summary(filters: ReportFilters) {
  const where = buildOrderWhere(filters);
  const itemWhere: Prisma.OrderItemWhereInput = { ...buildItemFilter(filters), order: buildBaseOrderWhere(filters) };
  const hasItemScope = Boolean(filters.productId || filters.categoryId);
  const [orders, units] = await Promise.all([
    db.order.aggregate({ where, _count: true, _sum: { total: true, subtotal: true, discountTotal: true, deliveryFee: true } }),
    db.orderItem.aggregate({ where: itemWhere, _sum: { quantity: true, lineTotal: true } }),
  ]);
  const count = orders._count;
  const gross = Number((hasItemScope ? units._sum.lineTotal : orders._sum.total)?.toString() ?? 0);
  return {
    orders: count,
    grossOrderTotal: gross.toFixed(3),
    subtotal: hasItemScope ? null : Number(orders._sum.subtotal?.toString() ?? 0).toFixed(3),
    discountTotal: hasItemScope ? null : Number(orders._sum.discountTotal?.toString() ?? 0).toFixed(3),
    deliveryFee: hasItemScope ? null : Number(orders._sum.deliveryFee?.toString() ?? 0).toFixed(3),
    units: units._sum.quantity ?? 0,
    averageOrderValue: (count ? gross / count : 0).toFixed(3),
  };
}

async function fulfillmentDuration(filters: ReportFilters) {
  const rows = await db.orderStatusHistory.findMany({
    where: { toStatus: "DELIVERED", order: buildOrderWhere(filters) },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: DELIVERY_DURATION_LIMIT + 1,
    select: { createdAt: true, order: { select: { createdAt: true } } },
  });
  const limited = rows.length > DELIVERY_DURATION_LIMIT;
  const hours = rows.slice(0, DELIVERY_DURATION_LIMIT).map((row) => (row.createdAt.getTime() - row.order.createdAt.getTime()) / 3_600_000).filter((value) => value >= 0);
  return { recordedDeliveries: hours.length, averageHours: hours.length ? (hours.reduce((total, value) => total + value, 0) / hours.length).toFixed(1) : null, coverage: limited ? "sampled" : "complete", limit: DELIVERY_DURATION_LIMIT };
}

async function inventoryReport(filters: ReportFilters) {
  const values: unknown[] = [];
  const condition = (sql: string, value?: string) => value ? (values.push(value), ` AND ${sql.replace("?", `$${values.length}`)}`) : "";
  const scope = `${condition('i."branchId" = ?', filters.branchId)}${condition('i."productId" = ?', filters.productId)}${filters.categoryId ? ` AND p."categoryId" = $${values.push(filters.categoryId)}` : ""}`;
  const valuationQuery = `SELECT COALESCE(SUM(CASE WHEN v.cost IS NOT NULL THEN i.quantity ELSE 0 END), 0)::int AS known_units, COALESCE(SUM(CASE WHEN v.cost IS NULL THEN i.quantity ELSE 0 END), 0)::int AS unavailable_units, COALESCE(SUM(CASE WHEN v.cost IS NOT NULL THEN i.quantity * v.cost ELSE 0 END), 0)::text AS cost FROM "InventoryLevel" i JOIN "Product" p ON p.id = i."productId" LEFT JOIN "ProductVariant" v ON v.id = i."variantId" WHERE TRUE${scope}`;
  const lowStockQuery = `SELECT i.id, p.name AS product, p.sku, b.name AS branch, i.quantity, i.reserved, i."lowStockAt" AS low_stock_at, (i.quantity - i.reserved) AS available, i."updatedAt" AS updated_at FROM "InventoryLevel" i JOIN "Product" p ON p.id = i."productId" JOIN "Branch" b ON b.id = i."branchId" WHERE i."lowStockAt" > 0 AND (i.quantity - i.reserved) <= i."lowStockAt"${scope} ORDER BY available ASC, p.name ASC, i.id ASC LIMIT ${LOW_STOCK_LIMIT + 1}`;
  const [valuationRows, lowStockRows] = await Promise.all([
    db.$queryRawUnsafe<Array<{ known_units: number; unavailable_units: number; cost: string }>>(valuationQuery, ...values),
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(lowStockQuery, ...values),
  ]);
  const valuation = valuationRows[0] ?? { known_units: 0, unavailable_units: 0, cost: "0" };
  const knownUnits = Number(valuation.known_units);
  const unavailableUnits = Number(valuation.unavailable_units);
  return {
    valuation: { status: knownUnits + unavailableUnits > 0 && unavailableUnits === 0 ? "available" : knownUnits === 0 ? "unavailable" : "partial", cost: knownUnits ? Number(valuation.cost).toFixed(3) : null, knownUnits, unavailableUnits, note: "Exact aggregate across all matching inventory levels. Only levels linked to a variant with an explicit cost are valued. Product-level cost is not stored." },
    inventory: lowStockRows.slice(0, LOW_STOCK_LIMIT),
    inventoryCoverage: { limit: LOW_STOCK_LIMIT, hasMore: lowStockRows.length > LOW_STOCK_LIMIT },
  };
}

function tableRequest(request: Request) {
  const params = new URL(request.url).searchParams;
  const table = params.get("table");
  if (!table || !reportTables.includes(table as ReportTable)) return null;
  const rawPage = Number(params.get("page") ?? 1);
  const rawPageSize = Number(params.get("pageSize") ?? 25);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10_000) : 1;
  const pageSize = Number.isSafeInteger(rawPageSize) && rawPageSize > 0 ? Math.min(rawPageSize, 100) : 25;
  const grouping = params.get("grouping") === "month" ? "month" : params.get("grouping") === "week" ? "week" : "day";
  return { table: table as ReportTable, page, pageSize, grouping };
}

async function tableReport(filters: ReportFilters, table: ReturnType<typeof tableRequest>) {
  if (!table) return null;
  const values: unknown[] = [filters.start, filters.end];
  const condition = (sql: string, value?: string) => value ? (values.push(value), ` AND ${sql.replace("?", `$${values.length}`)}`) : "";
  const scope = `o."createdAt" >= $1 AND o."createdAt" < $2${condition('o."branchId" = ?', filters.branchId)}`;
  // Item dimensions constrain every line-level total, never merely the parent order.
  const itemScope = (alias: string) => `${condition(`${alias}."productId" = ?`, filters.productId)}${filters.categoryId ? ` AND EXISTS (SELECT 1 FROM "Product" scoped_product WHERE scoped_product.id = ${alias}."productId" AND scoped_product."categoryId" = $${values.push(filters.categoryId)})` : ""}`;
  const limitOffset = () => { values.push(table.pageSize, (table.page - 1) * table.pageSize); return ` LIMIT $${values.length - 1} OFFSET $${values.length}`; };
  const query = table.table === "sales"
    ? `SELECT date_trunc('${table.grouping}', o."createdAt") AS period, COUNT(DISTINCT o.id)::int AS orders, COALESCE(SUM(i.quantity), 0)::int AS units, COALESCE(SUM(i."lineTotal"), 0)::text AS gross_line_total FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" WHERE ${scope}${itemScope("i")} GROUP BY 1 ORDER BY 1 DESC${limitOffset()}`
    : table.table === "products"
      ? `SELECT COALESCE(i."productName", 'Removed product') AS name, i.sku, COALESCE(SUM(i.quantity), 0)::int AS units, COALESCE(SUM(i."lineTotal"), 0)::text AS gross_line_total, COUNT(DISTINCT o.id)::int AS orders FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" WHERE ${scope}${itemScope("i")} GROUP BY i."productName", i.sku ORDER BY SUM(i.quantity) DESC, i."productName" ASC${limitOffset()}`
      : table.table === "categories"
        ? `SELECT c.name, COALESCE(SUM(i.quantity), 0)::int AS units, COALESCE(SUM(i."lineTotal"), 0)::text AS gross_line_total, COUNT(DISTINCT o.id)::int AS orders FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" JOIN "Product" p ON p.id = i."productId" JOIN "Category" c ON c.id = p."categoryId" WHERE ${scope}${itemScope("i")} GROUP BY c.id, c.name ORDER BY SUM(i.quantity) DESC, c.name ASC${limitOffset()}`
        : table.table === "branches"
          ? `SELECT COALESCE(b.name, 'Unassigned') AS name, COUNT(DISTINCT o.id)::int AS orders, COALESCE(SUM(i.quantity), 0)::int AS units, COALESCE(SUM(i."lineTotal"), 0)::text AS gross_line_total FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" LEFT JOIN "Branch" b ON b.id = o."branchId" WHERE ${scope}${itemScope("i")} GROUP BY b.id, b.name ORDER BY COUNT(DISTINCT o.id) DESC, name ASC${limitOffset()}`
          : table.table === "customers"
            ? `SELECT COALESCE(c.name, o."contactName", 'Guest') AS name, COALESCE(c.email, '') AS email, COUNT(DISTINCT o.id)::int AS orders, COALESCE(SUM(i.quantity), 0)::int AS units, COALESCE(SUM(i."lineTotal"), 0)::text AS gross_line_total FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" LEFT JOIN "Customer" c ON c.id = o."customerId" WHERE ${scope}${itemScope("i")} GROUP BY c.id, c.name, c.email, o."contactName" ORDER BY COUNT(DISTINCT o.id) DESC, name ASC${limitOffset()}`
            : table.table === "orders"
              ? `SELECT o."orderNumber", o.status::text AS status, o."paymentStatus"::text AS payment_status, COALESCE(b.name, 'Unassigned') AS branch, COALESCE(SUM(i.quantity), 0)::int AS units, COALESCE(SUM(i."lineTotal"), 0)::text AS gross_line_total, o."createdAt" AS created_at FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" LEFT JOIN "Branch" b ON b.id = o."branchId" WHERE ${scope}${itemScope("i")} GROUP BY o.id, b.name ORDER BY o."createdAt" DESC${limitOffset()}`
              : table.table === "promotions"
                ? `SELECT p.name, COUNT(r.id)::int AS redemptions, COALESCE(SUM(r.amount), 0)::text AS discount_amount, COUNT(DISTINCT o.id)::int AS orders FROM "PromotionRedemption" r JOIN "Promotion" p ON p.id = r."promotionId" JOIN "Order" o ON o.id = r."orderId" WHERE ${scope}${(filters.productId || filters.categoryId) ? ` AND EXISTS (SELECT 1 FROM "OrderItem" scoped_item WHERE scoped_item."orderId" = o.id${itemScope("scoped_item")})` : ""} GROUP BY p.id, p.name ORDER BY COUNT(r.id) DESC, p.name ASC${limitOffset()}`
                : `SELECT i.id, p.name AS product, b.name AS branch, i.quantity, i.reserved, i."lowStockAt" AS low_stock_at, (i.quantity - i.reserved) AS available, i."updatedAt" AS updated_at FROM "InventoryLevel" i JOIN "Product" p ON p.id = i."productId" JOIN "Branch" b ON b.id = i."branchId" WHERE i."lowStockAt" > 0 AND (i.quantity - i.reserved) <= i."lowStockAt"${condition('i."branchId" = ?', filters.branchId)}${condition('i."productId" = ?', filters.productId)}${filters.categoryId ? ` AND p."categoryId" = $${values.push(filters.categoryId)}` : ""} ORDER BY available ASC, p.name ASC${limitOffset()}`;
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(query, ...values);
  return { table: table.table, rows, pagination: { page: table.page, pageSize: table.pageSize, hasNextPage: rows.length === table.pageSize }, notes: table.table === "categories" ? ["Category attribution uses the current category of still-linked products; removed products are omitted."] : ["Units and gross line totals include only matching order items. Orders are distinct orders containing at least one matching item."] };
}

export async function GET(request?: Request) {
  const authorization = await authorizeAdminApi("reports", "read");
  if (!authorization.authorized) return authorization.response;
  const reportRequest = request ?? new Request("http://localhost/api/admin/reports");
  const filters = parseFilters(reportRequest);
  if (!filters) return NextResponse.json({ error: "Use valid UTC calendar dates with an end date after the start date (maximum 366 days)." }, { status: 400 });

  const requestedTable = tableRequest(reportRequest);
  if (requestedTable) {
    const data = await tableReport(filters, requestedTable);
    if (new URL(reportRequest.url).searchParams.get("format") === "csv") {
      const columns = data?.rows[0] ? Object.keys(data.rows[0]) : [];
      const rows = [columns, ...(data?.rows ?? []).map((row) => columns.map((column) => String(row[column] ?? "")))];
      return new NextResponse(rows.map((row) => row.map(csvCell).join(",")).join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename=${requestedTable.table}-report.csv` } });
    }
    return NextResponse.json(data);
  }
  const orderWhere = buildOrderWhere(filters);
  const [metrics, previousMetrics, orderStatuses, fulfillment, inventory, branches, categories, products] = await Promise.all([
    summary(filters), summary(previousPeriod(filters)),
    db.order.groupBy({ by: ["status"], where: orderWhere, _count: true, orderBy: { status: "asc" } }),
    fulfillmentDuration(filters),
    inventoryReport(filters),
    db.branch.findMany({ orderBy: { name: "asc" }, take: FILTER_OPTION_LIMIT + 1, select: { id: true, name: true } }),
    db.category.findMany({ orderBy: { name: "asc" }, take: FILTER_OPTION_LIMIT + 1, select: { id: true, name: true } }),
    db.product.findMany({ orderBy: { name: "asc" }, take: FILTER_OPTION_LIMIT + 1, select: { id: true, name: true, sku: true, categoryId: true } }),
  ]);
  const statusCount = (status: string) => orderStatuses.find((item) => item.status === status)?._count ?? 0;
  const report = {
    dateSemantics: filters.productId || filters.categoryId
      ? "Orders are distinct orders created during the UTC dates that contain at least one matching item. Units and gross line totals include only matching items; order-level discounts and delivery fees are not attributed."
      : "Orders created from the UTC start date through the UTC end date, inclusive. Gross order totals are order amounts, not recognized revenue.",
    period: { start: filters.start.toISOString(), end: new Date(filters.end.getTime() - 1).toISOString() },
    filters: { branchId: filters.branchId ?? null, categoryId: filters.categoryId ?? null, productId: filters.productId ?? null },
    metrics,
    comparison: { period: { start: previousPeriod(filters).start.toISOString(), end: new Date(previousPeriod(filters).end.getTime() - 1).toISOString() }, metrics: previousMetrics },
    orderStatuses,
    fulfillment: { delivered: statusCount("DELIVERED"), refunded: statusCount("REFUNDED"), cancelled: statusCount("CANCELLED"), inProgress: ["NEW", "ASSIGNED_TO_BRANCH", "ASSIGNED_TO_DRIVER", "OUT_FOR_DELIVERY", "REFUND_REQUESTED"].reduce((total, status) => total + statusCount(status), 0), duration: fulfillment },
    inventory: inventory.inventory,
    inventoryCoverage: inventory.inventoryCoverage,
    inventoryValuation: inventory.valuation,
    filterOptions: { branches: branches.slice(0, FILTER_OPTION_LIMIT), categories: categories.slice(0, FILTER_OPTION_LIMIT), products: products.slice(0, FILTER_OPTION_LIMIT), limit: FILTER_OPTION_LIMIT, truncated: { branches: branches.length > FILTER_OPTION_LIMIT, categories: categories.length > FILTER_OPTION_LIMIT, products: products.length > FILTER_OPTION_LIMIT } },
  };
  if (new URL(reportRequest.url).searchParams.get("format") === "csv") {
    const rows = [
      ["section", "label", "value", "detail"],
      ["scope", "created_at_utc", `${filters.start.toISOString().slice(0, 10)} to ${new Date(filters.end.getTime() - 1).toISOString().slice(0, 10)}`, "inclusive calendar dates"],
      ["metric", "orders", metrics.orders, "orders matching all selected filters"],
      ["metric", "gross_order_total_kwd", report.metrics.grossOrderTotal, filters.productId || filters.categoryId ? "sum of matching OrderItem.lineTotal" : "sum of Order.total; current status is not used to recognize revenue"],
      ...(metrics.discountTotal === null ? [] : [["metric", "discount_total_kwd", metrics.discountTotal, "order discount amounts; not a promotion-attribution metric"]]),
      ...(metrics.deliveryFee === null ? [] : [["metric", "delivery_fee_kwd", metrics.deliveryFee, "order delivery fees; not recognized revenue"]]),
      ["metric", "units", report.metrics.units, filters.productId || filters.categoryId ? "sum of matching order-item quantities" : "sum of order-item quantities on matching orders"],
       ["metric", "average_order_value_kwd", report.metrics.averageOrderValue, filters.productId || filters.categoryId ? "matching gross line total / distinct matching orders" : "gross order total / matching orders"],
       ["fulfillment", "currently_delivered_orders", report.fulfillment.delivered, "current status among orders created in the selected period"],
       ["fulfillment", "currently_refunded_orders", report.fulfillment.refunded, "current status among orders created in the selected period"],
       ["fulfillment", "currently_cancelled_orders", report.fulfillment.cancelled, "current status among orders created in the selected period"],
       ["fulfillment", "recorded_delivery_average_hours", report.fulfillment.duration.averageHours ?? "unavailable", `${report.fulfillment.duration.recordedDeliveries} DELIVERED status-history records; ${report.fulfillment.duration.coverage === "sampled" ? `first ${report.fulfillment.duration.limit} events only` : "complete coverage"}`],
       ["inventory_valuation", "known_variant_cost_kwd", report.inventoryValuation.cost ?? "unavailable", `${report.inventoryValuation.knownUnits} units valued; ${report.inventoryValuation.unavailableUnits} units unavailable`],
       ...(report.inventoryCoverage.hasMore ? [["scope", "low_stock_rows", report.inventory.length, `first ${report.inventoryCoverage.limit} ranked rows only; additional matching rows omitted`]] : []),
      ...orderStatuses.map((item) => ["order_status", item.status, item._count, "matching orders"]),
       ...inventory.inventory.map((item) => ["low_stock", String(item.product ?? ""), String(item.available ?? ""), `${String(item.branch ?? "")}; threshold ${String(item.low_stock_at ?? "")}; reserved ${String(item.reserved ?? "")}`]),
    ];
    return new NextResponse(rows.map((row) => row.map(csvCell).join(",")).join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=reports.csv" } });
  }
  return NextResponse.json(report);
}
