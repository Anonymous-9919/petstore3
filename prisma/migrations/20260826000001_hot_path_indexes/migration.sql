CREATE INDEX "Order_contactPhone_createdAt_idx" ON "Order"("contactPhone", "createdAt");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "InventoryReservation_active_expiresAt_orderId_idx" ON "InventoryReservation"("expiresAt", "orderId") WHERE "status" = 'ACTIVE';
