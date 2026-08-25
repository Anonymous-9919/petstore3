ALTER TABLE "InventoryReservation" ALTER COLUMN "expiresAt" DROP NOT NULL;

-- Existing cash orders were created with the online-payment timeout. Preserve
-- every unprocessed cash hold until staff explicitly accepts or cancels it.
UPDATE "InventoryReservation" AS reservation
SET "expiresAt" = NULL
FROM "Order" AS customer_order
WHERE reservation."orderId" = customer_order."id"
  AND customer_order."paymentMethod" = 'CASH'
  AND reservation."status" = 'ACTIVE';
