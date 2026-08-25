import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { inventoryMovementQuerySchema } from "@/server/validation/inventory";

type MovementRow = {
  id: string; createdAt: Date; type: string; reason: string | null; reasonValue: string | null; quantity: number;
  beforeQuantity: number | null; afterQuantity: number | null; note: string | null; referenceType: string | null; referenceId: string | null;
  product: string; sku: string | null; variant: string | null; variantSku: string | null; branch: string;
};

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const authorization = await authorizeAdminApi("inventory", "read");
  if (!authorization.authorized) return authorization.response;

  const parsed = inventoryMovementQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid stock movement query." }, { status: 400 });
  const { page, pageSize, branchId, categoryId, type, reason, query, startDate, endDate, format } = parsed.data;
  const values: unknown[] = [];
  const bind = (value: unknown) => `$${values.push(value)}`;
  const filters: string[] = [];
  if (branchId) filters.push(`m."branchId" = ${bind(branchId)}::uuid`);
  if (categoryId) filters.push(`p."categoryId" = ${bind(categoryId)}::uuid`);
  if (type) filters.push(`m.type = ${bind(type)}::"InventoryMovementType"`);
  if (reason) filters.push(`m.reason = ${bind(reason)}::"InventoryMovementReason"`);
  if (startDate) filters.push(`m."createdAt" >= ${bind(startDate)}`);
  if (endDate) filters.push(`m."createdAt" < ${bind(new Date(endDate.getTime() + 86_400_000))}`);
  if (query) {
    const search = bind(`%${query}%`);
    filters.push(`(p.name ILIKE ${search} OR p.sku ILIKE ${search} OR v.name ILIKE ${search} OR v.sku ILIKE ${search} OR m."referenceId"::text ILIKE ${search})`);
  }
  const from = `FROM "InventoryMovement" m JOIN "Product" p ON p.id = m."productId" JOIN "Branch" b ON b.id = m."branchId" LEFT JOIN "ProductVariant" v ON v.id = m."variantId"`;
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const columns = `m.id, m."createdAt", m.type::text, m.reason::text, m."reasonValue", m.quantity, m."beforeQuantity", m."afterQuantity", m.note, m."referenceType", m."referenceId"::text, p.name AS product, p.sku, v.name AS variant, v.sku AS "variantSku", b.name AS branch`;

  if (format === "csv") {
    const rows = await db.$queryRawUnsafe<MovementRow[]>(`SELECT ${columns} ${from} ${where} ORDER BY m."createdAt" DESC, m.id DESC LIMIT 10000`, ...values);
    const header = ["created_at", "product", "sku", "variant", "variant_sku", "branch", "type", "reason", "change", "before", "after", "reference_type", "reference_id", "note"];
    const csv = [header, ...rows.map((row) => [row.createdAt.toISOString(), row.product, row.sku, row.variant, row.variantSku, row.branch, row.type, row.reason ?? row.reasonValue, row.quantity, row.beforeQuantity, row.afterQuantity, row.referenceType, row.referenceId, row.note])].map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=stock-movements.csv", "Cache-Control": "no-store" } });
  }

  const countValues = [...values];
  const [movements, countRows] = await Promise.all([
    db.$queryRawUnsafe<MovementRow[]>(`SELECT ${columns} ${from} ${where} ORDER BY m."createdAt" DESC, m.id DESC LIMIT ${bind(pageSize)} OFFSET ${bind((page - 1) * pageSize)}`, ...values),
    db.$queryRawUnsafe<Array<{ total: number }>>(`SELECT COUNT(*)::int AS total ${from} ${where}`, ...countValues),
  ]);
  const total = countRows[0]?.total ?? 0;
  return NextResponse.json({ movements, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}
