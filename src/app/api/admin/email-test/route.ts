import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminApi } from "@/server/auth";
import { sendEmail } from "@/server/notifications/email";

const schema = z.object({ to: z.string().email().max(320) });

export async function POST(request: Request) {
  const authorization = await authorizeAdminApi("users");
  if (!authorization.authorized) return authorization.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid recipient." }, { status: 400 });
  try {
    const message = await sendEmail({
      to: parsed.data.to,
      subject: "Hello World",
      html: "<p>Congrats on sending your <strong>first email</strong>!</p>",
    });
    return NextResponse.json({ id: message?.id });
  } catch (error) {
    console.error("Unable to send test email.", error);
    return NextResponse.json({ error: "Unable to send email. Check the email configuration and try again." }, { status: 502 });
  }
}
