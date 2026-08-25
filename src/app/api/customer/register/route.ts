import { NextResponse } from "next/server";
import { z } from "zod";
import { CUSTOMER_SESSION_COOKIE, createCustomerSession, hashPassword } from "@/server/auth";
import { canonicalizeKuwaitPhone, kuwaitPhoneLookupValues } from "@/lib/phone";
import { db } from "@/server/db";

export const runtime = "nodejs";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(32).transform((value, context) => {
    const phone = canonicalizeKuwaitPhone(value);
    if (!phone) {
      context.addIssue({ code: "custom", message: "Enter a valid Kuwait phone number." });
      return z.NEVER;
    }
    return phone;
  }),
  password: z.string().min(8).max(256),
});
const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function POST(request: Request) {
  const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your name, email, phone number, and a password of at least 8 characters." }, { status: 400 });

  const { name, email, phone, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  try {
    const user = await db.$transaction(async (tx) => {
      if (await tx.user.findUnique({ where: { email }, select: { id: true } })) throw new Error("EMAIL_IN_USE");
      const existingCustomer = await tx.customer.findFirst({
        where: { phone: { in: kuwaitPhoneLookupValues(phone) } },
        select: { id: true },
      });
      if (existingCustomer) throw new Error("PHONE_IN_USE");

      const createdUser = await tx.user.create({ data: { name, email, passwordHash, role: "CUSTOMER" } });
      await tx.customer.create({ data: { userId: createdUser.id, name, email, phone } });
      return createdUser;
    });
    const session = await createCustomerSession(user.id);
    const response = NextResponse.json({ ok: true }, { status: 201 });
    response.cookies.set(CUSTOMER_SESSION_COOKIE, session.token, { ...cookieOptions, expires: session.expiresAt });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_IN_USE") return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
    if (error instanceof Error && error.message === "PHONE_IN_USE") return NextResponse.json({ error: "This phone number is already in use and cannot be claimed without verification." }, { status: 409 });
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "An account already exists for these details." }, { status: 409 });
    throw error;
  }
}
