-- Keep the earliest display position if historic imports attached a path more than once.
WITH duplicates AS (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "productId", "path" ORDER BY "sortOrder", "id") AS position
    FROM "public"."ProductImage"
)
DELETE FROM "public"."ProductImage" AS image
USING duplicates
WHERE image."id" = duplicates."id" AND duplicates.position > 1;

CREATE UNIQUE INDEX "ProductImage_productId_path_key" ON "public"."ProductImage"("productId", "path");
