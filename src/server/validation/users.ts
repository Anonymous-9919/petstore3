import { z } from "zod";

const staffRole = z.enum(["OWNER", "MANAGER", "ORDER_STAFF", "INVENTORY_STAFF", "CONTENT_MANAGER", "VIEWER", "DRIVER"]);

export const createStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  email: z.string().trim().email("Enter a valid email address.").max(320),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
  role: staffRole,
});

export const updateStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  email: z.string().trim().email("Enter a valid email address.").max(320),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200).optional(),
  role: staffRole,
  status: z.enum(["ACTIVE", "DISABLED"]),
});
