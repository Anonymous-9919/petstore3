import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { promotionInputSchema } from "@/server/validation/promotion";
import { hasValidPromotionProducts, hasValidPromotionReferences } from "../route";
import { normalizePromotionSchedule } from "@/server/promotions";

export async function PATCH(request: Request, context: { params: Promise<{ promotionId: string }> }) {
  const authorization = await authorizeAdminApi("marketing");
  if (!authorization.authorized) return authorization.response;
  const parsed = promotionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid promotion." }, { status: 400 });
  if (!await hasValidPromotionProducts([...parsed.data.qualifyingProductIds, ...parsed.data.rewardProductIds])) return NextResponse.json({ error: "Promotion qualifying and reward products must be active products." }, { status: 400 });
  if (!await hasValidPromotionReferences(parsed.data)) return NextResponse.json({ error: "Promotion targets, branches, and areas must be active." }, { status: 400 });
  const { promotionId } = await context.params;
  const { targetIds, branchIds, areaIds, scope, ...data } = normalizePromotionSchedule(parsed.data);
  try {
    const promotion = await db.$transaction(async (transaction) => {
      await transaction.promotionTarget.deleteMany({ where: { promotionId } });
      await transaction.promotionBranchRestriction.deleteMany({ where: { promotionId } });
      await transaction.promotionAreaRestriction.deleteMany({ where: { promotionId } });
      return transaction.promotion.update({
        where: { id: promotionId },
        data: {
          ...data,
          scope,
          targets: targetIds.length ? { create: targetIds.map((id) => scope === "PRODUCT" ? { productId: id } : { categoryId: id }) } : undefined,
          branchRestrictions: branchIds.length ? { create: branchIds.map((branchId) => ({ branchId })) } : undefined,
          areaRestrictions: areaIds.length ? { create: areaIds.map((areaId) => ({ areaId })) } : undefined,
        },
        include: { targets: true },
      });
    });
    return NextResponse.json(promotion);
  } catch {
    return NextResponse.json({ error: "Unable to update promotion. The code may already exist, the promotion may not exist, or a target is invalid." }, { status: 409 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ promotionId: string }> }) {
  const authorization = await authorizeAdminApi("marketing");
  if (!authorization.authorized) return authorization.response;
  const { promotionId } = await context.params;
  try {
    return NextResponse.json(await db.promotion.update({ where: { id: promotionId }, data: { isActive: false } }));
  } catch {
    return NextResponse.json({ error: "Promotion not found." }, { status: 404 });
  }
}
