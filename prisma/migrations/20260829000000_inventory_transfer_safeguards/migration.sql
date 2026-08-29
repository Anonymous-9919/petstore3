-- Keep stock balances internally consistent while preserving potentially inconsistent legacy rows.
ALTER TABLE "InventoryLevel"
  ADD CONSTRAINT "InventoryLevel_quantity_nonnegative" CHECK ("quantity" >= 0) NOT VALID,
  ADD CONSTRAINT "InventoryLevel_reserved_nonnegative" CHECK ("reserved" >= 0) NOT VALID,
  ADD CONSTRAINT "InventoryLevel_reserved_within_quantity" CHECK ("reserved" <= "quantity") NOT VALID;

-- The catalog-variant migration already created the variant-specific transfer
-- uniqueness index. Retain it rather than creating a duplicate constraint.
