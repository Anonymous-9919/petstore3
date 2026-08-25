import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";

const money = z.number().finite().min(0).refine((value) => Number.isInteger(value * 1000), "Amounts support up to three decimal places.");
const updateSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("branch"), branchId: z.string().uuid(), isActive: z.boolean(), deliveryEnabled: z.boolean() }),
  z.object({ type: z.literal("coverage"), coverageId: z.string().uuid(), isActive: z.boolean(), deliveryFee: money, minimumOrderValue: money, priority: z.number().int().min(0).max(10000) }),
]);

export async function GET() {
  const authorization = await authorizeAdminApi("delivery");
  if (!authorization.authorized) return authorization.response;

  const branches = await db.branch.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      nameAr: true,
      isActive: true,
      deliveryEnabled: true,
      coverage: {
        orderBy: [{ priority: "asc" }, { area: { name: "asc" } }],
        select: {
          id: true,
          isActive: true,
          deliveryFee: true,
          minimumOrderValue: true,
          priority: true,
          area: { select: { name: true, nameAr: true, province: { select: { name: true, nameAr: true } } } },
        },
      },
    },
  });
  return NextResponse.json({ branches });
}

export async function PATCH(request: Request) {
  const authorization = await authorizeAdminApi("delivery");
  if (!authorization.authorized) return authorization.response;
  const user = authorization.user;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid delivery update.", details: parsed.error.flatten() }, { status: 400 });

  try {
    if (parsed.data.type === "branch") {
      const { branchId, isActive, deliveryEnabled } = parsed.data;
      const branch = await db.branch.update({ where: { id: branchId }, data: { isActive, deliveryEnabled }, select: { id: true, isActive: true, deliveryEnabled: true } });
      await db.auditLog.create({ data: { actorId: user.id, action: "branch.delivery.updated", entityType: "branch", entityId: branch.id, after: { isActive, deliveryEnabled } } });
      return NextResponse.json({ branch });
    }

    const { coverageId, isActive, deliveryFee, minimumOrderValue, priority } = parsed.data;
    const coverage = await db.branchDeliveryCoverage.update({
      where: { id: coverageId },
      data: { isActive, deliveryFee, minimumOrderValue, priority },
      select: { id: true, isActive: true, deliveryFee: true, minimumOrderValue: true, priority: true },
    });
    await db.auditLog.create({ data: { actorId: user.id, action: "branch.delivery.coverage.updated", entityType: "branchDeliveryCoverage", entityId: coverage.id, after: { isActive, deliveryFee, minimumOrderValue, priority } } });
    return NextResponse.json({ coverage });
  } catch {
    return NextResponse.json({ error: "Delivery configuration was not found." }, { status: 404 });
  }
}
