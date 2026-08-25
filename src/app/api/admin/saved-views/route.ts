import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";

const productFiltersSchema = z.object({
  query: z.string().trim().max(200),
  status: z.enum(["all", "active", "inactive"]),
  archived: z.enum(["active", "archived", "all"]),
  stock: z.enum(["all", "in-stock", "out-of-stock"]),
  categoryId: z.string().uuid().or(z.literal("")),
  sort: z.enum(["sortOrder", "name", "basePrice", "updatedAt"]),
  direction: z.enum(["asc", "desc"]),
});

const savedViewSchema = z.object({
  name: z.string().trim().min(1).max(80),
  filters: productFiltersSchema,
});

export async function GET() {
  const authorization = await authorizeAdminApi("catalog", "read");
  if (!authorization.authorized) return authorization.response;
  const views = await db.savedView.findMany({ where: { userId: authorization.user.id, resource: "products" }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(views);
}

export async function POST(request: Request) {
  const authorization = await authorizeAdminApi("catalog");
  if (!authorization.authorized) return authorization.response;
  const parsed = savedViewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid saved view." }, { status: 400 });

  const view = await db.savedView.upsert({
    where: { userId_resource_name: { userId: authorization.user.id, resource: "products", name: parsed.data.name } },
    create: { userId: authorization.user.id, resource: "products", ...parsed.data },
    update: { filters: parsed.data.filters },
  });
  return NextResponse.json(view, { status: 201 });
}
