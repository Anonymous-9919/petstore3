import { z } from "zod";

const uuid = z.string().uuid();
const quantity = z.number().int().min(1).max(1_000_000);

export const transferListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(["DRAFT", "IN_TRANSIT", "RECEIVED", "CANCELLED"]).optional(),
  branchId: uuid.optional(),
});

export const createTransferSchema = z.object({
  sourceBranchId: uuid,
  destinationBranchId: uuid,
  note: z.string().trim().max(500).optional(),
  lines: z.array(z.object({ productId: uuid, variantId: uuid.optional(), quantity })).min(1).max(200),
}).refine((value) => value.sourceBranchId !== value.destinationBranchId, "Source and destination branches must differ.")
  .refine((value) => new Set(value.lines.map((line) => `${line.productId}:${line.variantId ?? "default"}`)).size === value.lines.length, "A variant can appear only once in a transfer.");

export const transferActionSchema = z.object({
  action: z.enum(["dispatch", "receive", "cancel"]),
});
