import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { requireUser } from "@/lib/guard";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const OWNER_EMAIL = "szigalkina@gmail.com";

export async function POST(req: Request) {
  try {
    const userId = await requireUser();
    if (!rateLimit(`support:${clientIp(req)}`, 5)) {
      return NextResponse.json(
        { error: "Too many messages — try again in a few minutes" },
        { status: 429 }
      );
    }
    const { message } = await req.json();
    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Write a message first" }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      // No email provider configured — the client falls back to a mailto link.
      return NextResponse.json({ error: "email_not_configured" }, { status: 501 });
    }
    const db = await getDb();
    const [me] = await db.select().from(users).where(eq(users.id, userId));
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Voice Baby Album <support@voicebabyalbum.app>",
        to: OWNER_EMAIL,
        reply_to: me?.email,
        subject: `Support message from ${me?.email ?? "a user"}`,
        text: message.trim().slice(0, 5000),
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("support send failed", e);
    return NextResponse.json({ error: "Couldn't send" }, { status: 500 });
  }
}
