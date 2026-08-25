import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSession, destroySession, isStaff, SESSION_COOKIE, verifyPassword } from "@/server/auth";
import { db } from "@/server/db";
import { loginThrottle, requestClientIp } from "@/server/login-throttle";

export const runtime = "nodejs";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(256),
});

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function POST(request: Request) {
  const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });

  const ip = requestClientIp(request);
  const throttle = loginThrottle.check("admin", parsed.data.email, ip);
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(throttle.retryAfter) } },
    );
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || user.status !== "ACTIVE" || !isStaff(user.role) || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    loginThrottle.recordFailure("admin", parsed.data.email, ip);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const session = await createAdminSession(user.id);
  loginThrottle.clearAccount("admin", parsed.data.email);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, session.token, { ...cookieOptions, expires: session.expiresAt });
  return response;
}

export async function DELETE(request: Request) {
  const token = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === SESSION_COOKIE)?.[1];
  if (token) await destroySession(token);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
