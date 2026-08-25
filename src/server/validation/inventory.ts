import { z } from "zod";

const positiveInteger = z.coerce.number().int().min(1);

export const inventoryListQuerySchema = z.object({
  page: positiveInteger.max(10_000).default(1),
  pageSize: positiveInteger.max(100).default(25),
  branchId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  stock: z.enum(["all", "in-stock", "out-of-stock", "low-stock"]).default("all"),
  query: z.string().trim().max(100).optional(),
  ledgerLevelId: z.string().uuid().optional(),
});

export const inventoryAdjustmentSchema = z.object({
  inventoryLevelId: z.string().uuid(),
  quantity: z.number().int().min(-1_000_000).max(1_000_000).refine((value) => value !== 0, "Adjustment cannot be zero."),
  reason: z.string().trim().min(1, "A reason is required.").max(120).optional(),
  note: z.string().trim().min(1, "A note is required.").max(500),
});

export const lowStockThresholdSchema = z.object({
  inventoryLevelId: z.string().uuid(),
  lowStockAt: z.number().int().min(0).max(1_000_000),
});

export const inventoryMovementQuerySchema = z.object({
  page: positiveInteger.max(10_000).default(1),
  pageSize: positiveInteger.max(100).default(25),
  branchId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(["OPENING_BALANCE", "ADJUSTMENT", "RESERVATION", "RELEASE", "SALE", "RESTORE", "TRANSFER_OUT", "TRANSFER_IN"]).optional(),
  reason: z.enum(["OPENING_BALANCE", "MANUAL_ADJUSTMENT", "CSV_IMPORT", "ORDER_RESERVATION", "ORDER_SALE", "ORDER_RELEASE", "TRANSFER_DISPATCH", "TRANSFER_RECEIPT", "TRANSFER_CANCELLATION"]).optional(),
  query: z.string().trim().max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  format: z.enum(["json", "csv"]).default("json"),
}).refine((value) => !value.startDate || !value.endDate || value.startDate <= value.endDate, { message: "Start date must be before end date.", path: ["endDate"] });
