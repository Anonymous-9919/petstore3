# Phase 3 Catalog Schema Evolution Runbook

## Scope

This release adds immutable numeric `publicId` values to products, categories, option groups and values, branches, and areas. It also adds `ProductVariant`, a default variant per existing product, and nullable variant links on inventory, reservations, movements, and order items. Legacy IDs, product prices/SKUs, and product-level inventory are intentionally retained.

## Preflight

1. Take a verified PostgreSQL backup and test restoration.
2. Confirm the application build that reads both product and default-variant data is deployed before applying the migration.
3. Run the following checks. Resolve any result before migration:

```sql
SELECT 'Product without legacy ID' AS issue, count(*) FROM "Product" WHERE "legacyId" IS NULL
UNION ALL SELECT 'Non-positive legacy ID', count(*) FROM "Product" WHERE "legacyId" <= 0;
SELECT "legacyId", count(*) FROM "Product" WHERE "legacyId" IS NOT NULL GROUP BY "legacyId" HAVING count(*) > 1;
```

Null or non-positive legacy IDs are supported and receive newly allocated public IDs. Duplicates must not exist because the current schema already declares legacy IDs unique.

## Deployment

1. Apply `20260825000002_phase_3_catalog_variants_expand` through the normal Prisma deployment process during a low-write window. Do not use `db push`.
2. Do not run this migration from a workstation with an unreviewed schema drift.
3. Confirm completion:

```sql
SELECT count(*) AS products_without_default_variant
FROM "Product" p
WHERE NOT EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = p."id" AND v."isDefault");
SELECT count(*) AS inventory_without_variant_link FROM "InventoryLevel" WHERE "variantId" IS NULL;
```

Both counts should be zero. Existing carts retain numeric IDs because valid legacy IDs are reused as public IDs. New API fields are additive and legacy storefront fields remain emitted.

## Rollback And Follow-up

Do not drop the new columns or table as an operational rollback. Roll back application traffic to the prior application version; it ignores additive database fields. Restore only from a verified backup if database recovery is required.

Product-level inventory remains authoritative in this phase. The nullable variant links record identity only. A later, separately reviewed migration may make variant inventory authoritative after reconciliation; it must not remove legacy product inventory, product SKU, or product pricing until historical orders, reservations, imports, and all clients have been migrated.
