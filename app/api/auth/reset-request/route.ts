import { NextResponse } from "next/server";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { resetTokens, users } from "@/lib/schema";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!rateLimit(`reset:${clientIp(req)}`, 5)) {
    return NextResponse.json(
      { error: "Too many attempts — wait a few minutes and try again" },
      { status: 429 }
    );
  }
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const db = await getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, String(email).toLowerCase()));

  // Always answer ok — never reveal whether an email has an account.
  if (!user) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  await db.insert(resetTokens).values({
    token,
    userId: user.id,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });
  const base = process.env.APP_URL ?? new URL(req.url).origin;
  const link = `${base}/reset?token=${token}`;

  if (process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Voice Baby Album <login@voicebabyalbum.app>",
        to: user.email,
        subject: "Reset your password",
        html: `<p>Tap to choose a new password for Voice Baby Album:</p><p><a href="${link}">Reset password</a></p><p>This link expires in 30 minutes. If you didn't ask for this, ignore it.</p>`,
      }),
    });
    return NextResponse.json({ ok: true });
  }
  if (process.env.NODE_ENV !== "production") {
    // Dev convenience only — NEVER expose the link in production.
    return NextResponse.json({ ok: true, devLink: link });
  }
  console.warn("Password reset requested but RESEND_API_KEY is not set — no email sent");
  return NextResponse.json({ ok: true });
}
