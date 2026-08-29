import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/server/auth";
import { db } from "@/server/db";
import { revalidateStorefrontCatalog } from "@/server/catalog-cache";
import { productEditorInputSchema } from "@/server/validation/catalog";

export async function GET(_request: Request, context: { params: Promise<{ productId: string }> }) {
  const authorization = await authorizeAdminApi("catalog", "read");
  if (!authorization.authorized) return authorization.response;
  const { productId } = await context.params;
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      optionGroups: { orderBy: { sortOrder: "asc" }, include: { values: { orderBy: { sortOrder: "asc" } } } },
      variants: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
      inventoryLevels: { include: { branch: { select: { id: true, name: true, nameAr: true } }, variant: { select: { id: true, sku: true, name: true, nameAr: true } } }, orderBy: { branch: { name: "asc" } } },
    },
  });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(request: Request, context: { params: Promise<{ productId: string }> }) {
  const authorization = await authorizeAdminApi("catalog");
  if (!authorization.authorized) return authorization.response;
  const parsed = productEditorInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid product." }, { status: 400 });
  try {
    const { productId } = await context.params;
    const { images, optionGroups, defaultVariant, variants, ...productData } = parsed.data;
    const product = await db.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id: productId }, include: { variants: { select: { id: true, sku: true, barcode: true, name: true, nameAr: true, price: true, compareAtPrice: true, cost: true, weight: true, isDefault: true, isActive: true } } } });
      if (!existing) throw new Error("PRODUCT_NOT_FOUND");
      const category = await tx.category.findFirst({ where: { id: productData.categoryId, isActive: true, archivedAt: null }, select: { id: true } });
      if (!category) throw new Error("CATEGORY_UNAVAILABLE");
      const updated = await tx.product.update({ where: { id: productId }, data: productData });
      const defaultVariantId = await tx.productVariant.findFirst({ where: { productId, isDefault: true }, select: { id: true } });
      const { id: _defaultVariantId, ...defaultVariantData } = defaultVariant ?? {};
      const variantData = { ...defaultVariantData, sku: defaultVariantData.sku ?? productData.sku, price: defaultVariantData.price ?? productData.basePrice, compareAtPrice: defaultVariantData.compareAtPrice ?? productData.compareAtPrice, isActive: defaultVariantData.isActive ?? productData.isActive };
      if (defaultVariantId) await tx.productVariant.update({ where: { id: defaultVariantId.id }, data: variantData });
      else await tx.productVariant.create({ data: { productId, ...variantData, isDefault: true } });

      const incomingVariantIds = variants.flatMap((variant) => variant.id ? [variant.id] : []);
      // Variants can be referenced by orders and stock movements, so editor removal
      // retires them instead of deleting history required by checkout and inventory.
      await tx.productVariant.updateMany({ where: { productId, isDefault: false, ...(incomingVariantIds.length ? { id: { notIn: incomingVariantIds } } : {}) }, data: { isActive: false } });
      for (const variant of variants) {
        const { id, ...variantData } = variant;
        if (id) {
          const existingVariant = await tx.productVariant.findFirst({ where: { id, productId, isDefault: false }, select: { id: true } });
          if (!existingVariant) throw new Error("VARIANT_NOT_FOUND");
          await tx.productVariant.update({ where: { id }, data: variantData });
        } else {
          const createdVariant = await tx.productVariant.create({ data: { productId, ...variantData, price: variantData.price ?? productData.basePrice, compareAtPrice: variantData.compareAtPrice ?? null, isDefault: false, isActive: variantData.isActive ?? true } });
          const branches = await tx.branch.findMany({ select: { id: true } });
          if (branches.length) await tx.inventoryLevel.createMany({ data: branches.map((branch) => ({ branchId: branch.id, productId, variantId: createdVariant.id })) });
        }
      }

      // Recreating images avoids transient collisions on the product/order uniqueness constraint.
      await tx.productImage.deleteMany({ where: { productId } });
      if (images.length) await tx.productImage.createMany({ data: images.map((image) => ({ ...image, productId })) });

      const incomingGroupIds = optionGroups.flatMap((group) => group.id ? [group.id] : []);
      await tx.productOptionGroup.deleteMany({ where: { productId, ...(incomingGroupIds.length ? { id: { notIn: incomingGroupIds } } : {}) } });
      for (const group of optionGroups) {
        const { id, values, ...groupData } = group;
        const existingGroup = id ? await tx.productOptionGroup.findFirst({ where: { id, productId }, select: { id: true } }) : null;
        if (id && !existingGroup) throw new Error("OPTION_GROUP_NOT_FOUND");
        const savedGroup = existingGroup
          ? await tx.productOptionGroup.update({ where: { id: existingGroup.id }, data: groupData })
          : await tx.productOptionGroup.create({ data: { ...groupData, productId } });
        const incomingValueIds = values.flatMap((value) => value.id ? [value.id] : []);
        await tx.productOptionValue.deleteMany({ where: { groupId: savedGroup.id, ...(incomingValueIds.length ? { id: { notIn: incomingValueIds } } : {}) } });
        for (const value of values) {
          const { id: valueId, ...valueData } = value;
          const existingValue = valueId ? await tx.productOptionValue.findFirst({ where: { id: valueId, groupId: savedGroup.id }, select: { id: true } }) : null;
          if (valueId && !existingValue) throw new Error("OPTION_VALUE_NOT_FOUND");
          if (existingValue) await tx.productOptionValue.update({ where: { id: existingValue.id }, data: valueData });
          else await tx.productOptionValue.create({ data: { ...valueData, groupId: savedGroup.id } });
        }
      }
      const { variants: previousVariants, ...before } = existing;
      await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "catalog.product_updated", entityType: "product", entityId: productId, before: { ...before, variantCount: previousVariants.length }, after: { ...productData, variantCount: variants.length } } });
      return updated;
    });
    revalidateStorefrontCatalog();
    return NextResponse.json(product);
  }
  catch { return NextResponse.json({ error: "Product not found, or the category, slug, or SKU is invalid." }, { status: 409 }); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ productId: string }> }) {
  const authorization = await authorizeAdminApi("catalog");
  if (!authorization.authorized) return authorization.response;
  const { productId } = await context.params;
  try {
    const product = await db.$transaction(async (tx) => {
      const before = await tx.product.findUnique({ where: { id: productId }, select: { isActive: true, archivedAt: true } });
      if (!before) throw new Error("PRODUCT_NOT_FOUND");
      const updated = await tx.product.update({ where: { id: productId }, data: { isActive: false, archivedAt: new Date() } });
      await tx.auditLog.create({ data: { actorId: authorization.user.id, action: "catalog.product_archived", entityType: "product", entityId: productId, before, after: { isActive: false, archivedAt: updated.archivedAt } } });
      return updated;
    });
    revalidateStorefrontCatalog();
    return NextResponse.json(product);
  }
  catch { return NextResponse.json({ error: "Product not found." }, { status: 404 }); }
}
