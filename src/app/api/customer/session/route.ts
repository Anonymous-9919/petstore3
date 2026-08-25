import { NextResponse } from "next/server";
import { z } from "zod";
import { CUSTOMER_SESSION_COOKIE, createCustomerSession, destroySession, verifyPassword } from "@/server/auth";
import { canonicalizeKuwaitPhone, kuwaitPhoneLookupValues } from "@/lib/phone";
import { db } from "@/server/db";
import { loginThrottle, requestClientIp } from "@/server/login-throttle";

export const runtime = "nodejs";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(256),
});
const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

function cookieToken(request: Request) {
  return request.headers.get("cookie")?.split(";").map((part) => part.trim().split("=")).find(([name]) => name === CUSTOMER_SESSION_COOKIE)?.[1];
}

export async function GET() {
  const { currentCustomer } = await import("@/server/auth");
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ customer: null });
  return NextResponse.json({ customer: { name: customer.name, email: customer.email, phone: customer.phone } });
}

export async function POST(request: Request) {
  const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });

  const ip = requestClientIp(request);
  const throttle = loginThrottle.check("customer", parsed.data.email, ip);
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(throttle.retryAfter) } },
    );
  }

  const user = await db.user.findFirst({
    where: { email: parsed.data.email, status: "ACTIVE", role: "CUSTOMER", customer: { isNot: null } },
    include: { customer: { select: { id: true, phone: true } } },
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    loginThrottle.recordFailure("customer", parsed.data.email, ip);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const canonicalPhone = canonicalizeKuwaitPhone(user.customer!.phone);
  if (canonicalPhone && canonicalPhone !== user.customer!.phone) {
    const owner = await db.customer.findFirst({
      where: { id: { not: user.customer!.id }, phone: { in: kuwaitPhoneLookupValues(canonicalPhone) } },
      select: { id: true },
    });
    if (!owner) {
      try {
        await db.customer.update({ where: { id: user.customer!.id }, data: { phone: canonicalPhone } });
      } catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") throw error;
      }
    }
  }

  const session = await createCustomerSession(user.id);
  loginThrottle.clearAccount("customer", parsed.data.email);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, session.token, { ...cookieOptions, expires: session.expiresAt });
  return response;
}

export async function DELETE(request: Request) {
  const token = cookieToken(request);
  if (token) await destroySession(token);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
