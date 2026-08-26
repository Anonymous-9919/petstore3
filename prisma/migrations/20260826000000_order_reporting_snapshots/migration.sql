ALTER TABLE "Order"
  ADD COLUMN "acceptedAt" TIMESTAMPTZ(6),
  ADD COLUMN "paidAt" TIMESTAMPTZ(6),
  ADD COLUMN "deliveredAt" TIMESTAMPTZ(6),
  ADD COLUMN "cancelledAt" TIMESTAMPTZ(6),
  ADD COLUMN "refundedAt" TIMESTAMPTZ(6);

ALTER TABLE "OrderItem"
  ADD COLUMN "categoryIdSnapshot" UUID,
  ADD COLUMN "categoryNameSnapshot" TEXT,
  ADD COLUMN "unitCost" DECIMAL(12,3);

UPDATE "OrderItem" item
SET "categoryIdSnapshot" = snapshot."categoryId",
    "categoryNameSnapshot" = snapshot.category_name,
    "unitCost" = snapshot.unit_cost
FROM (
  SELECT source.id, product."categoryId", category.name AS category_name, variant.cost AS unit_cost
  FROM "OrderItem" source
  JOIN "Product" product ON product.id = source."productId"
  LEFT JOIN "Category" category ON category.id = product."categoryId"
  LEFT JOIN "ProductVariant" variant ON variant.id = source."variantId"
) snapshot
WHERE item.id = snapshot.id;

UPDATE "Order" orders
SET "acceptedAt" = history."createdAt"
FROM (
  SELECT DISTINCT ON ("orderId") "orderId", "createdAt"
  FROM "OrderStatusHistory"
  WHERE "toStatus" IN ('ASSIGNED_TO_BRANCH', 'ASSIGNED_TO_DRIVER', 'OUT_FOR_DELIVERY', 'DELIVERED')
  ORDER BY "orderId", "createdAt"
) history
WHERE orders.id = history."orderId";

UPDATE "Order" orders
SET "deliveredAt" = history."createdAt"
FROM (
  SELECT DISTINCT ON ("orderId") "orderId", "createdAt"
  FROM "OrderStatusHistory"
  WHERE "toStatus" = 'DELIVERED'
  ORDER BY "orderId", "createdAt"
) history
WHERE orders.id = history."orderId";

UPDATE "Order" orders
SET "cancelledAt" = history."createdAt"
FROM (
  SELECT DISTINCT ON ("orderId") "orderId", "createdAt"
  FROM "OrderStatusHistory"
  WHERE "toStatus" = 'CANCELLED'
  ORDER BY "orderId", "createdAt"
) history
WHERE orders.id = history."orderId";

UPDATE "Order" orders
SET "refundedAt" = history."createdAt"
FROM (
  SELECT DISTINCT ON ("orderId") "orderId", "createdAt"
  FROM "OrderStatusHistory"
  WHERE "toStatus" = 'REFUNDED'
  ORDER BY "orderId", "createdAt"
) history
WHERE orders.id = history."orderId";

CREATE INDEX "Order_deliveredAt_idx" ON "Order"("deliveredAt");
